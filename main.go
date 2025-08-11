package main

import (
	"crypto/md5"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Employee struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	Name       string     `json:"name"`
	EmployeeNo string     `json:"employee_no" gorm:"uniqueIndex"`
	Department string     `json:"department"`
	Position   string     `json:"position"`
	Email      string     `json:"email"`
	Phone      string     `json:"phone"`
	Status     string     `json:"status" gorm:"default:active"` // active, inactive, resigned
	JoinDate   *time.Time `json:"join_date"`                   // 入职日期
	LeaveDate  *time.Time `json:"leave_date"`                   // 离职日期
	DeletedAt  *time.Time `json:"deleted_at" gorm:"index"`      // 软删除
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type PayrollTemplate struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Fields      string    `json:"fields" gorm:"type:text"` // JSON格式存储字段配置
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Payroll struct {
	ID             uint            `json:"-" gorm:"primaryKey"`              // 内部ID，不对外暴露
	UUID           string          `json:"id" gorm:"uniqueIndex;size:36"`    // 对外暴露的UUID
	EmployeeID     uint            `json:"employee_id"`
	Employee       Employee        `json:"employee" gorm:"foreignKey:EmployeeID"`
	Period         string          `json:"period"` // 工资期间 2024-08
	TemplateID     uint            `json:"template_id"`
	Template       PayrollTemplate `json:"template" gorm:"foreignKey:TemplateID"`
	WorkDays       float64         `json:"work_days" gorm:"default:0"`       // 实际工作天数
	MonthDays      float64         `json:"month_days" gorm:"default:0"`      // 当月总天数
	IsProrated     bool            `json:"is_prorated" gorm:"default:false"` // 是否按天数比例计算
	PayrollData    string          `json:"payroll_data" gorm:"type:text"`    // JSON格式存储工资数据
	OriginalGross  float64         `json:"original_gross"`                   // 原始应发工资（全月）
	TotalGross     float64         `json:"total_gross"`                      // 实际应发工资
	TotalNet       float64         `json:"total_net"`                        // 实发工资
	Status         string          `json:"status" gorm:"default:draft"`      // draft, published, signed
	PublishedAt    *time.Time      `json:"published_at"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type PayrollSignature struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	PayrollID     uint      `json:"payroll_id"`
	Payroll       Payroll   `json:"payroll" gorm:"foreignKey:PayrollID"`
	SignatureData string    `json:"signature_data" gorm:"type:text"` // Base64签名图片
	SignatureHash string    `json:"signature_hash"`                  // 签名哈希值
	IPAddress     string    `json:"ip_address"`
	UserAgent     string    `json:"user_agent"`
	DeviceInfo    string    `json:"device_info"`
	SignedAt      time.Time `json:"signed_at"`
	CreatedAt     time.Time `json:"created_at"`
}

type PayrollNotification struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	PayrollID uint       `json:"payroll_id"`
	Payroll   Payroll    `json:"payroll" gorm:"foreignKey:PayrollID"`
	Type      string     `json:"type"`      // email, sms, wechat
	Recipient string     `json:"recipient"` // 接收者地址
	Status    string     `json:"status"`    // pending, sent, failed
	SentAt    *time.Time `json:"sent_at"`
	ErrorMsg  string     `json:"error_msg"`
	CreatedAt time.Time  `json:"created_at"`
}

type CreateEmployeeRequest struct {
	Name       string `json:"name" binding:"required"`
	EmployeeNo string `json:"employee_no" binding:"required"`
	Department string `json:"department" binding:"required"`
	Position   string `json:"position" binding:"required"`
	Email      string `json:"email" binding:"required,email"`
	Phone      string `json:"phone" binding:"required"`
	JoinDate   string `json:"join_date"` // 以字符串接收日期
}

type CreatePayrollRequest struct {
	EmployeeID  uint                   `json:"employee_id" binding:"required"`
	Period      string                 `json:"period" binding:"required"`
	TemplateID  uint                   `json:"template_id" binding:"required"`
	WorkDays    float64                `json:"work_days"`    // 实际工作天数
	MonthDays   float64                `json:"month_days"`   // 当月总天数
	IsProrated  bool                   `json:"is_prorated"` // 是否按天数比例计算
	PayrollData map[string]interface{} `json:"payroll_data" binding:"required"`
}

type SignPayrollRequest struct {
	PayrollUUID   string `json:"payroll_id" binding:"required"` // 使用UUID
	SignatureData string `json:"signature_data" binding:"required"`
	IPAddress     string `json:"ip_address"`
	UserAgent     string `json:"user_agent"`
	DeviceInfo    string `json:"device_info"`
}

type PublishPayrollRequest struct {
	PayrollUUIDs    []string `json:"payroll_ids" binding:"required"` // 使用UUID列表
	NotifyEmployees bool     `json:"notify_employees"`
}

// 管理员用户
type AdminUser struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Username string `json:"username" gorm:"uniqueIndex"`
	Password string `json:"-"` // 不在JSON中显示
	IsActive bool   `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Remember bool   `json:"remember"`
}

// 登录响应
type LoginResponse struct {
	Token    string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	Username string    `json:"username"`
}

// JWT Claims
type JWTClaims struct {
	Username string `json:"username"`
	UserID   uint   `json:"user_id"`
	jwt.RegisteredClaims
}

var db *gorm.DB
var jwtSecret = []byte("easysalary-jwt-secret-key-2025") // 实际部署时应该使用环境变量

func initDB() {
	var err error
	db, err = gorm.Open(sqlite.Open("payroll.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = db.AutoMigrate(&Employee{}, &PayrollTemplate{}, &Payroll{}, &PayrollSignature{}, &PayrollNotification{}, &AdminUser{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	createSampleData()
}

func createSampleData() {
	// 创建不同入职日期的员工示例
	now := time.Now()
	joinDate1 := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local) // 月初入职
	joinDate2 := time.Date(now.Year(), now.Month(), 15, 0, 0, 0, 0, time.Local) // 15号入职
	joinDate3 := time.Date(now.Year(), now.Month()-1, 20, 0, 0, 0, 0, time.Local) // 上月20号入职
	
	employees := []Employee{
		{Name: "张三", EmployeeNo: "EMP001", Department: "技术部", Position: "高级工程师", Email: "zhangsan@company.com", Phone: "13800138001", JoinDate: &joinDate1},
		{Name: "李四", EmployeeNo: "EMP002", Department: "产品部", Position: "产品经理", Email: "lisi@company.com", Phone: "13800138002", JoinDate: &joinDate2},
		{Name: "王五", EmployeeNo: "EMP003", Department: "设计部", Position: "UI设计师", Email: "wangwu@company.com", Phone: "13800138003", JoinDate: &joinDate3},
	}

	for _, emp := range employees {
		var existingEmp Employee
		if err := db.Where("employee_no = ?", emp.EmployeeNo).First(&existingEmp).Error; err != nil {
			db.Create(&emp)
		}
	}

	templateFields := map[string]interface{}{
		"basic_salary":     map[string]string{"name": "基本工资", "type": "number"},
		"performance":      map[string]string{"name": "绩效奖金", "type": "number"},
		"meal_allowance":   map[string]string{"name": "餐补", "type": "number"},
		"transport":        map[string]string{"name": "交通补贴", "type": "number"},
		"tax":              map[string]string{"name": "个人所得税", "type": "number"},
		"social_insurance": map[string]string{"name": "社保", "type": "number"},
	}
	fieldsJSON, _ := json.Marshal(templateFields)

	template := PayrollTemplate{
		Name:        "标准工资模板",
		Description: "包含基本工资、绩效、津贴和扣除项的标准模板",
		Fields:      string(fieldsJSON),
		IsActive:    true,
	}

	var existingTemplate PayrollTemplate
	if err := db.Where("name = ?", template.Name).First(&existingTemplate).Error; err != nil {
		db.Create(&template)
	}

	// 创建默认管理员用户
	var existingAdmin AdminUser
	if err := db.Where("username = ?", "admin").First(&existingAdmin).Error; err != nil {
		// 默认密码: admin123
		hashedPassword := hashPassword("admin123")
		admin := AdminUser{
			Username: "admin",
			Password: hashedPassword,
			IsActive: true,
		}
		db.Create(&admin)
		log.Printf("创建默认管理员用户: admin/admin123")
	}
}

func setupRoutes() *gin.Engine {
	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"*"}
	r.Use(cors.New(config))

	r.Static("/uploads", "./uploads")
	r.Static("/web", "./web")

	api := r.Group("/api/v1")
	{
		// 认证相关路由（无需鉴权）
		auth := api.Group("/auth")
		{
			auth.POST("/login", login)
			auth.POST("/verify", verifyToken)
		}

		// 公开路由（无需鉴权）- 员工查看工资条
		api.GET("/payrolls/:id", getPayroll)
		api.GET("/payrolls/employee/:employee_id", getEmployeePayrolls)
		api.POST("/payrolls/sign", signPayroll)
		api.GET("/payrolls/:id/signature", getPayrollSignature)

		// 需要鉴权的管理员路由
		admin := api.Group("/")
		admin.Use(authMiddleware())
		{
			admin.GET("/employees", getEmployees)
			admin.POST("/employees", createEmployee)
			admin.GET("/employees/:id", getEmployee)
			admin.PUT("/employees/:id", updateEmployee)
			admin.DELETE("/employees/:id", deleteEmployee)

			admin.GET("/templates", getTemplates)
			admin.POST("/templates", createTemplate)
			admin.PUT("/templates/:id", updateTemplate)
			admin.DELETE("/templates/:id", deleteTemplate)

			admin.GET("/payrolls", getPayrolls)
			admin.POST("/payrolls", createPayroll)
			admin.PUT("/payrolls/:id", updatePayroll)
			admin.DELETE("/payrolls/:id", deletePayroll)
			
			admin.POST("/payrolls/publish", publishPayrolls)
			admin.GET("/notifications", getNotifications)
			admin.POST("/notifications/resend", resendNotification)
		}
	}

	return r
}

// 登录处理
func login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	var user AdminUser
	if err := db.Where("username = ? AND is_active = ?", req.Username, true).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	if !verifyPassword(user.Password, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	token, expiresAt, err := generateJWTToken(user, req.Remember)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成token失败"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		Username:  user.Username,
	})
}

// 验证token
func verifyToken(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "缺少Authorization header"})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	claims, err := verifyJWTToken(tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":    true,
		"username": claims.Username,
		"user_id":  claims.UserID,
	})
}

func getEmployees(c *gin.Context) {
	var employees []Employee
	query := db.Where("deleted_at IS NULL")
	
	// 支持状态筛选
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	
	if err := query.Find(&employees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": employees})
}

func createEmployee(c *gin.Context) {
	var req CreateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employee := Employee{
		Name:       req.Name,
		EmployeeNo: req.EmployeeNo,
		Department: req.Department,
		Position:   req.Position,
		Email:      req.Email,
		Phone:      req.Phone,
	}

	// 处理入职日期
	if req.JoinDate != "" {
		joinDate, err := time.Parse("2006-01-02", req.JoinDate)
		if err == nil {
			employee.JoinDate = &joinDate
		}
	}

	if err := db.Create(&employee).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": employee})
}

func getEmployee(c *gin.Context) {
	id := c.Param("id")
	var employee Employee
	if err := db.Where("deleted_at IS NULL").First(&employee, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": employee})
}

func updateEmployee(c *gin.Context) {
	id := c.Param("id")
	var employee Employee
	if err := db.Where("deleted_at IS NULL").First(&employee, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
		return
	}

	var req CreateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 更新员工信息
	employee.Name = req.Name
	employee.Department = req.Department
	employee.Position = req.Position
	employee.Email = req.Email
	employee.Phone = req.Phone
	
	// 处理入职日期
	if req.JoinDate != "" {
		joinDate, err := time.Parse("2006-01-02", req.JoinDate)
		if err == nil {
			employee.JoinDate = &joinDate
		}
	}

	if err := db.Save(&employee).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": employee})
}

func deleteEmployee(c *gin.Context) {
	id := c.Param("id")
	var employee Employee
	if err := db.Where("deleted_at IS NULL").First(&employee, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
		return
	}

	// 检查是否有相关的工资条
	var payrollCount int64
	db.Model(&Payroll{}).Where("employee_id = ?", id).Count(&payrollCount)
	
	if payrollCount > 0 {
		// 如果有工资条，只能软删除和标记为离职
		now := time.Now()
		employee.Status = "resigned"
		employee.LeaveDate = &now
		employee.DeletedAt = &now
		
		if err := db.Save(&employee).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{
			"message": "员工已标记为离职（保留历史数据）",
			"action": "soft_delete",
		})
	} else {
		// 如果没有任何工资记录，也进行软删除以保留审计记录
		now := time.Now()
		employee.Status = "resigned"
		employee.LeaveDate = &now
		employee.DeletedAt = &now
		
		if err := db.Save(&employee).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{
			"message": "员工已删除（软删除）",
			"action": "soft_delete",
		})
	}
}

func getTemplates(c *gin.Context) {
	var templates []PayrollTemplate
	if err := db.Where("is_active = ?", true).Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": templates})
}

func createTemplate(c *gin.Context) {
	var template PayrollTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Create(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": template})
}

func updateTemplate(c *gin.Context) {
	id := c.Param("id")
	var template PayrollTemplate
	if err := db.First(&template, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}

	var req PayrollTemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	template.Name = req.Name
	template.Description = req.Description
	template.Fields = req.Fields
	template.IsActive = req.IsActive

	if err := db.Save(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": template})
}

func deleteTemplate(c *gin.Context) {
	id := c.Param("id")
	var template PayrollTemplate
	if err := db.First(&template, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}

	// 检查是否有工资条使用此模板
	var count int64
	db.Model(&Payroll{}).Where("template_id = ?", id).Count(&count)
	if count > 0 {
		// 如果有工资条使用，只禁用模板而不删除
		template.IsActive = false
		if err := db.Save(&template).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Template disabled (in use by payrolls)"})
		return
	}

	// 如果没有工资条使用，可以删除
	if err := db.Delete(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Template deleted successfully"})
}

func getPayrolls(c *gin.Context) {
	var payrolls []Payroll
	query := db.Preload("Employee").Preload("Template")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if period := c.Query("period"); period != "" {
		query = query.Where("period = ?", period)
	}
	if employeeID := c.Query("employee_id"); employeeID != "" {
		query = query.Where("employee_id = ?", employeeID)
	}

	if err := query.Find(&payrolls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": payrolls})
}

func createPayroll(c *gin.Context) {
	var req CreatePayrollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 计算工资时考虑是否按比例
	var totalGross, totalNet float64
	if req.IsProrated && req.WorkDays > 0 && req.MonthDays > 0 {
		// 按天数比例计算：只对收入项按比例，扣款项保持不变
		ratio := req.WorkDays / req.MonthDays
		totalGross, totalNet = calculateProratedPayroll(req.PayrollData, ratio)
	} else {
		// 全月工资
		totalGross, totalNet = calculatePayroll(req.PayrollData)
		if req.WorkDays == 0 {
			req.WorkDays = req.MonthDays // 如果没有指定，默认为全月
		}
	}
	
	// 保存原始的全月工资额用于参考
	originalGross, _ := calculatePayroll(req.PayrollData)

	payrollDataJSON, _ := json.Marshal(req.PayrollData)
	payroll := Payroll{
		UUID:          generateUUID(),
		EmployeeID:    req.EmployeeID,
		Period:        req.Period,
		TemplateID:    req.TemplateID,
		WorkDays:      req.WorkDays,
		MonthDays:     req.MonthDays,
		IsProrated:    req.IsProrated,
		PayrollData:   string(payrollDataJSON),
		OriginalGross: originalGross,
		TotalGross:    totalGross,
		TotalNet:      totalNet,
		Status:        "draft",
	}

	if err := db.Create(&payroll).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	db.Preload("Employee").Preload("Template").First(&payroll, payroll.ID)

	c.JSON(http.StatusCreated, gin.H{"data": payroll})
}

func getPayroll(c *gin.Context) {
	uuid := c.Param("id")
	var payroll Payroll
	if err := db.Preload("Employee").Preload("Template").Where("uuid = ?", uuid).First(&payroll).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payroll not found"})
		return
	}

	var signature PayrollSignature
	if err := db.Where("payroll_id = ?", payroll.ID).First(&signature).Error; err == nil {
		payroll.Status = "signed"
	}

	c.JSON(http.StatusOK, gin.H{"data": payroll})
}

func updatePayroll(c *gin.Context) {
	uuid := c.Param("id")
	var payroll Payroll
	if err := db.Where("uuid = ?", uuid).First(&payroll).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payroll not found"})
		return
	}

	var req CreatePayrollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if payroll.Status != "draft" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot update published or signed payroll"})
		return
	}

	// 计算工资时考虑是否按比例
	var totalGross, totalNet float64
	if req.IsProrated && req.WorkDays > 0 && req.MonthDays > 0 {
		// 按天数比例计算：只对收入项按比例，扣款项保持不变
		ratio := req.WorkDays / req.MonthDays
		totalGross, totalNet = calculateProratedPayroll(req.PayrollData, ratio)
	} else {
		// 全月工资
		totalGross, totalNet = calculatePayroll(req.PayrollData)
		if req.WorkDays == 0 {
			req.WorkDays = req.MonthDays
		}
	}
	
	// 保存原始的全月工资额用于参考
	originalGross, _ := calculatePayroll(req.PayrollData)

	payrollDataJSON, _ := json.Marshal(req.PayrollData)

	payroll.PayrollData = string(payrollDataJSON)
	payroll.WorkDays = req.WorkDays
	payroll.MonthDays = req.MonthDays
	payroll.IsProrated = req.IsProrated
	payroll.OriginalGross = originalGross
	payroll.TotalGross = totalGross
	payroll.TotalNet = totalNet

	if err := db.Save(&payroll).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": payroll})
}

func deletePayroll(c *gin.Context) {
	uuid := c.Param("id")
	var payroll Payroll
	if err := db.Where("uuid = ?", uuid).First(&payroll).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payroll not found"})
		return
	}

	if payroll.Status != "draft" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete published or signed payroll"})
		return
	}

	if err := db.Delete(&payroll).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payroll deleted successfully"})
}

func publishPayrolls(c *gin.Context) {
	var req PublishPayrollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var payrolls []Payroll
	if err := db.Preload("Employee").Where("uuid IN ? AND status = ?", req.PayrollUUIDs, "draft").Find(&payrolls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(payrolls) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid draft payrolls found"})
		return
	}

	now := time.Now()
	if err := db.Model(&Payroll{}).Where("uuid IN ?", req.PayrollUUIDs).Updates(map[string]interface{}{
		"status":       "published",
		"published_at": &now,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.NotifyEmployees {
		for _, payroll := range payrolls {
			sendPayrollNotification(payroll)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully published %d payrolls", len(payrolls)),
		"data":    req.PayrollUUIDs,
	})
}

func getEmployeePayrolls(c *gin.Context) {
	employeeID := c.Param("employee_id")
	var payrolls []Payroll

	query := db.Preload("Employee").Preload("Template").Where("employee_id = ? AND status IN ?", employeeID, []string{"published", "signed"})

	if period := c.Query("period"); period != "" {
		query = query.Where("period = ?", period)
	}

	if err := query.Order("period DESC").Find(&payrolls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": payrolls})
}

func signPayroll(c *gin.Context) {
	var req SignPayrollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var payroll Payroll
	if err := db.Where("uuid = ? AND status = ?", req.PayrollUUID, "published").First(&payroll).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payroll not found or not published"})
		return
	}

	var existingSignature PayrollSignature
	if err := db.Where("payroll_id = ?", payroll.ID).First(&existingSignature).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payroll already signed"})
		return
	}

	signatureHash := generateSignatureHash(req.SignatureData)
	signatureFileName, err := saveSignatureImage(req.SignatureData, signatureHash)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save signature image"})
		return
	}

	signature := PayrollSignature{
		PayrollID:     payroll.ID, // 使用内部ID关联
		SignatureData: signatureFileName, // 存储文件路径而不是base64数据
		SignatureHash: signatureHash,
		IPAddress:     req.IPAddress,
		UserAgent:     req.UserAgent,
		DeviceInfo:    req.DeviceInfo,
		SignedAt:      time.Now(),
	}

	if err := db.Create(&signature).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := db.Model(&payroll).Update("status", "signed").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Payroll signed successfully",
		"data":    signature,
	})
}

func getPayrollSignature(c *gin.Context) {
	payrollUUID := c.Param("id")
	// 先找到工资条
	var payroll Payroll
	if err := db.Where("uuid = ?", payrollUUID).First(&payroll).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payroll not found"})
		return
	}
	
	var signature PayrollSignature
	if err := db.Preload("Payroll").Where("payroll_id = ?", payroll.ID).First(&signature).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Signature not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": signature})
}

func getNotifications(c *gin.Context) {
	var notifications []PayrollNotification
	query := db.Preload("Payroll").Preload("Payroll.Employee")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("created_at DESC").Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": notifications})
}

func resendNotification(c *gin.Context) {
	var req struct {
		NotificationID uint `json:"notification_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var notification PayrollNotification
	if err := db.Preload("Payroll").Preload("Payroll.Employee").First(&notification, req.NotificationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	success := sendPayrollNotification(notification.Payroll)
	if success {
		now := time.Now()
		notification.Status = "sent"
		notification.SentAt = &now
		notification.ErrorMsg = ""
		db.Save(&notification)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification resent successfully"})
}

func calculatePayroll(data map[string]interface{}) (totalGross, totalNet float64) {
	// 动态识别收入项和扣款项
	// 包含这些关键词的字段被认为是扣款项
	deductionKeywords := []string{"tax", "insurance", "deduction", "扣款", "扣除", "罚款", "penalty"}
	
	// 先计算所有收入项
	for key, val := range data {
		if amount, ok := val.(float64); ok {
			// 检查是否为扣款项
			isDeduction := false
			keyLower := strings.ToLower(key)
			for _, keyword := range deductionKeywords {
				if strings.Contains(keyLower, keyword) {
					isDeduction = true
					break
				}
			}
			
			// 如果不是扣款项，就是收入项
			if !isDeduction && amount > 0 {
				totalGross += amount
			}
		}
	}
	
	// 从总收入中减去所有扣款项
	totalNet = totalGross
	for key, val := range data {
		if amount, ok := val.(float64); ok {
			keyLower := strings.ToLower(key)
			for _, keyword := range deductionKeywords {
				if strings.Contains(keyLower, keyword) && amount > 0 {
					totalNet -= amount
					break
				}
			}
		}
	}

	return totalGross, totalNet
}

// 按比例计算工资：只对基本工资按比例，其他收入项和扣款项都保持不变
func calculateProratedPayroll(data map[string]interface{}, ratio float64) (totalGross, totalNet float64) {
	// 扣款项关键词（这些项不按比例计算）
	deductionKeywords := []string{"tax", "insurance", "deduction", "扣款", "扣除", "罚款", "penalty", "fund", "公积金"}
	
	// 基本工资关键词（只有这些按比例计算）
	basicSalaryKeywords := []string{"basic_salary", "base_salary", "基本工资", "底薪"}
	
	// 计算所有收入项
	for key, val := range data {
		if amount, ok := val.(float64); ok && amount > 0 {
			keyLower := strings.ToLower(key)
			
			// 检查是否为扣款项
			isDeduction := false
			for _, keyword := range deductionKeywords {
				if strings.Contains(keyLower, keyword) {
					isDeduction = true
					break
				}
			}
			
			// 如果不是扣款项，就是收入项
			if !isDeduction {
				// 检查是否为基本工资（精确匹配）
				isBasicSalary := false
				for _, keyword := range basicSalaryKeywords {
					if keyLower == keyword {
						isBasicSalary = true
						break
					}
				}
				
				// 基本工资按比例，其他收入项保持原值
				if isBasicSalary {
					totalGross += amount * ratio
				} else {
					totalGross += amount  // 绩效、餐补等保持原值
				}
			}
		}
	}
	
	// 从总收入中减去所有扣款项（扣款项不按比例，保持原值）
	totalNet = totalGross
	for key, val := range data {
		if amount, ok := val.(float64); ok && amount > 0 {
			keyLower := strings.ToLower(key)
			for _, keyword := range deductionKeywords {
				if strings.Contains(keyLower, keyword) {
					totalNet -= amount  // 扣款项保持原值，不按比例
					break
				}
			}
		}
	}

	return totalGross, totalNet
}

// 密码哈希
func hashPassword(password string) string {
	hash := md5.Sum([]byte(password + "easysalary-salt"))
	return hex.EncodeToString(hash[:])
}

// 验证密码
func verifyPassword(hashedPassword, password string) bool {
	return hashedPassword == hashPassword(password)
}

// 生成JWT Token
func generateJWTToken(user AdminUser, remember bool) (string, time.Time, error) {
	expiresAt := time.Now().Add(24 * time.Hour) // 默认24小时
	if remember {
		expiresAt = time.Now().Add(7 * 24 * time.Hour) // 记住登录7天
	}

	claims := JWTClaims{
		Username: user.Username,
		UserID:   user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "easysalary",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	return tokenString, expiresAt, err
}

// 验证JWT Token
func verifyJWTToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// JWT中间件
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "需要登录"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := verifyJWTToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的token"})
			c.Abort()
			return
		}

		// 将用户信息存储在上下文中
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Next()
	}
}

func generateSignatureHash(signatureData string) string {
	hash := md5.Sum([]byte(signatureData + time.Now().String()))
	return hex.EncodeToString(hash[:])
}

func saveSignatureImage(base64Data, hash string) (string, error) {
	uploadsDir := "./uploads/signatures"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return "", err
	}

	data, err := base64.StdEncoding.DecodeString(strings.Split(base64Data, ",")[1])
	if err != nil {
		return "", err
	}

	fileName := fmt.Sprintf("%s.png", hash)
	filePath := filepath.Join(uploadsDir, fileName)

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", err
	}

	return fmt.Sprintf("/uploads/signatures/%s", fileName), nil
}

func sendPayrollNotification(payroll Payroll) bool {
	notification := PayrollNotification{
		PayrollID: payroll.ID,
		Type:      "email",
		Recipient: payroll.Employee.Email,
		Status:    "pending",
	}

	log.Printf("Sending payroll notification to %s for period %s", payroll.Employee.Email, payroll.Period)

	success := true

	if success {
		now := time.Now()
		notification.Status = "sent"
		notification.SentAt = &now
	} else {
		notification.Status = "failed"
		notification.ErrorMsg = "Failed to send email"
	}

	db.Create(&notification)
	return success
}

// 生成UUID
func generateUUID() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		log.Fatal(err)
	}
	uuid := fmt.Sprintf("%x-%x-%x-%x-%x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
	return uuid
}

func main() {
	initDB()

	if err := os.MkdirAll("./uploads/signatures", 0755); err != nil {
		log.Fatal("Failed to create uploads directory:", err)
	}

	r := setupRoutes()

	log.Println("Server starting on :40010...")
	if err := r.Run(":40010"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
