class PayrollAPI {
    constructor(baseURL = '/api/v1') {
        this.baseURL = baseURL;
    }

    // 获取认证头
    getAuthHeaders() {
        const token = localStorage.getItem('adminToken');
        if (token) {
            return { 'Authorization': 'Bearer ' + token };
        }
        return {};
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(), // 自动添加认证头
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async getEmployees() {
        return await this.request('/employees');
    }

    async createEmployee(employeeData) {
        return await this.request('/employees', {
            method: 'POST',
            body: JSON.stringify(employeeData),
        });
    }

    async getEmployee(employeeId) {
        return await this.request(`/employees/${employeeId}`);
    }

    async updateEmployee(employeeId, employeeData) {
        return await this.request(`/employees/${employeeId}`, {
            method: 'PUT',
            body: JSON.stringify(employeeData),
        });
    }

    async deleteEmployee(employeeId) {
        return await this.request(`/employees/${employeeId}`, {
            method: 'DELETE',
        });
    }

    async getTemplates() {
        return await this.request('/templates');
    }

    async createTemplate(templateData) {
        return await this.request('/templates', {
            method: 'POST',
            body: JSON.stringify(templateData),
        });
    }

    async updateTemplate(templateId, templateData) {
        return await this.request(`/templates/${templateId}`, {
            method: 'PUT',
            body: JSON.stringify(templateData),
        });
    }

    async deleteTemplate(templateId) {
        return await this.request(`/templates/${templateId}`, {
            method: 'DELETE',
        });
    }

    async getPayrolls(filters = {}) {
        const params = new URLSearchParams(filters);
        const endpoint = `/payrolls${params.toString() ? '?' + params.toString() : ''}`;
        return await this.request(endpoint);
    }

    async createPayroll(payrollData) {
        return await this.request('/payrolls', {
            method: 'POST',
            body: JSON.stringify(payrollData),
        });
    }

    async getPayroll(payrollId) {
        return await this.request(`/payrolls/${payrollId}`);
    }

    async updatePayroll(payrollId, payrollData) {
        return await this.request(`/payrolls/${payrollId}`, {
            method: 'PUT',
            body: JSON.stringify(payrollData),
        });
    }

    async deletePayroll(payrollId) {
        return await this.request(`/payrolls/${payrollId}`, {
            method: 'DELETE',
        });
    }

    async publishPayrolls(payrollIds, notifyEmployees = true) {
        return await this.request('/payrolls/publish', {
            method: 'POST',
            body: JSON.stringify({
                payroll_ids: payrollIds,
                notify_employees: notifyEmployees,
            }),
        });
    }

    // 员工工资条查询
    async getEmployeePayrolls(employeeId, period = null) {
        const params = period ? `?period=${period}` : '';
        return await this.request(`/payrolls/employee/${employeeId}${params}`);
    }

    async signPayroll(signatureData) {
        return await this.request('/payrolls/sign', {
            method: 'POST',
            body: JSON.stringify(signatureData),
        });
    }

    async getPayrollSignature(payrollId) {
        return await this.request(`/payrolls/${payrollId}/signature`);
    }

    async getNotifications(status = null) {
        const params = status ? `?status=${status}` : '';
        return await this.request(`/notifications${params}`);
    }

    async resendNotification(notificationId) {
        return await this.request('/notifications/resend', {
            method: 'POST',
            body: JSON.stringify({
                notification_id: notificationId,
            }),
        });
    }
}

class PayrollManager {
    constructor() {
        this.api = new PayrollAPI();
        this.currentSignature = null;
    }

    async createNewPayroll(employeeId, period, templateId, payrollData) {
        try {
            const result = await this.api.createPayroll({
                employee_id: employeeId,
                period: period,
                template_id: templateId,
                payroll_data: payrollData
            });

            console.log('工资条创建成功:', result.data);
            return result.data;
        } catch (error) {
            console.error('创建工资条失败:', error);
            throw error;
        }
    }

    async publishPayrollsBatch(payrollIds, shouldNotify = true) {
        try {
            const result = await this.api.publishPayrolls(payrollIds, shouldNotify);
            console.log('工资条发布成功:', result.message);
            return result;
        } catch (error) {
            console.error('发布工资条失败:', error);
            throw error;
        }
    }

    async handlePayrollSignature(payrollId, signatureCanvas) {
        try {
            const signatureDataURL = signatureCanvas.toDataURL();

            const signatureData = {
                payroll_id: payrollId,
                signature_data: signatureDataURL,
                ip_address: await this.getClientIP(),
                user_agent: navigator.userAgent,
                device_info: this.getDeviceInfo()
            };

            const result = await this.api.signPayroll(signatureData);
            console.log('签名成功:', result.message);
            return result.data;
        } catch (error) {
            console.error('签名失败:', error);
            throw error;
        }
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return '未知IP';
        }
    }

    getDeviceInfo() {
        const userAgent = navigator.userAgent;
        let deviceInfo = '未知设备';

        if (/Android/i.test(userAgent)) {
            deviceInfo = 'Android设备';
        } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
            deviceInfo = 'iOS设备';
        } else if (/Windows/i.test(userAgent)) {
            deviceInfo = 'Windows设备';
        } else if (/Mac/i.test(userAgent)) {
            deviceInfo = 'Mac设备';
        }

        return deviceInfo;
    }

    async getEmployeePayrollHistory(employeeId) {
        try {
            const result = await this.api.getEmployeePayrolls(employeeId);
            return result.data;
        } catch (error) {
            console.error('获取工资条历史失败:', error);
            throw error;
        }
    }
}

class PayrollDataProcessor {
    static createStandardPayrollData(basicSalary, performance = 0, allowances = {}, deductions = {}) {
        return {
            basic_salary: basicSalary,
            performance: performance,
            meal_allowance: allowances.meal || 0,
            transport: allowances.transport || 0,
            tax: deductions.tax || 0,
            social_insurance: deductions.socialInsurance || 0
        };
    }

    static calculateTotals(payrollData) {
        const grossItems = ['basic_salary', 'performance', 'meal_allowance', 'transport'];
        const deductionItems = ['tax', 'social_insurance'];

        let totalGross = 0;
        let totalDeductions = 0;

        grossItems.forEach(item => {
            totalGross += payrollData[item] || 0;
        });

        deductionItems.forEach(item => {
            totalDeductions += payrollData[item] || 0;
        });

        return {
            totalGross,
            totalDeductions,
            totalNet: totalGross - totalDeductions
        };
    }

    static validatePayrollData(payrollData) {
        const required = ['basic_salary'];
        const errors = [];

        required.forEach(field => {
            if (!payrollData[field] || payrollData[field] <= 0) {
                errors.push(`${field} 是必填项且必须大于0`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PayrollAPI,
        PayrollManager,
        PayrollDataProcessor
    };
}

