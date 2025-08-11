#!/bin/bash

# Test employee management functionality

API_URL="http://localhost:40010/api/v1"

echo "=== Testing Employee Management ==="

# 1. Get all employees
echo -e "\n1. Getting all employees..."
curl -s "${API_URL}/employees" | python3 -m json.tool | head -20

# 2. Update an employee
echo -e "\n2. Updating employee 1..."
curl -s -X PUT "${API_URL}/employees/1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三(已更新)",
    "employee_no": "EMP001",
    "department": "研发部",
    "position": "技术总监",
    "email": "zhangsan.updated@company.com",
    "phone": "13800138888",
    "join_date": "2025-08-01"
  }' | python3 -m json.tool

# 3. Create a test employee without payroll
echo -e "\n3. Creating a test employee without payroll..."
TEST_EMPLOYEE=$(curl -s -X POST "${API_URL}/employees" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试员工",
    "employee_no": "TEST001",
    "department": "测试部",
    "position": "测试工程师",
    "email": "test@company.com",
    "phone": "13900000001",
    "join_date": "2025-08-11"
  }')
  
TEST_ID=$(echo $TEST_EMPLOYEE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
echo "Created test employee with ID: $TEST_ID"

# 4. Delete employee without payroll (should hard delete)
echo -e "\n4. Deleting test employee (no payroll records)..."
curl -s -X DELETE "${API_URL}/employees/${TEST_ID}" | python3 -m json.tool

# 5. Create a payroll for employee 2
echo -e "\n5. Creating a payroll for employee 2..."
curl -s -X POST "${API_URL}/payrolls" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 2,
    "period": "2025-08",
    "template_id": 1,
    "is_prorated": false,
    "work_days": 22,
    "month_days": 22,
    "payroll_data": {
      "basic_salary": 12000,
      "performance": 2000,
      "meal_allowance": 300,
      "transport": 200,
      "tax": 1500,
      "social_insurance": 1200
    }
  }' | python3 -m json.tool | head -10

# 6. Try to delete employee 2 (should soft delete)
echo -e "\n6. Trying to delete employee 2 (has payroll records)..."
curl -s -X DELETE "${API_URL}/employees/2" | python3 -m json.tool

# 7. Get all employees (employee 2 should not appear)
echo -e "\n7. Getting all employees after deletion..."
curl -s "${API_URL}/employees" | python3 -m json.tool | head -30

echo -e "\n=== Employee Management Test Complete ==="
echo "Please check http://localhost:40010/web/admin.html to verify the UI functionality."