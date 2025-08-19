#!/bin/bash

# Test template management functionality

API_URL="http://localhost:40010/api/v1"

echo "=== Testing Template Management ==="

# 1. Create a new template
echo -e "\n1. Creating a new template..."
TEMPLATE_RESPONSE=$(curl -s -X POST "${API_URL}/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "高级管理人员模板",
    "description": "适用于高级管理人员的工资模板",
    "fields": "{\"basic_salary\":{\"name\":\"基本工资\",\"type\":\"number\"},\"performance\":{\"name\":\"绩效奖金\",\"type\":\"number\"},\"housing\":{\"name\":\"住房补贴\",\"type\":\"number\"},\"communication\":{\"name\":\"通讯补贴\",\"type\":\"number\"},\"tax\":{\"name\":\"个人所得税\",\"type\":\"number\"},\"social_insurance\":{\"name\":\"社保\",\"type\":\"number\"}}",
    "is_active": true
  }')

TEMPLATE_ID=$(echo $TEMPLATE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
echo "Created template with ID: $TEMPLATE_ID"

# 2. Get all templates
echo -e "\n2. Getting all templates..."
curl -s "${API_URL}/templates" | python3 -m json.tool | head -20

# 3. Update the template
echo -e "\n3. Updating the template..."
curl -s -X PUT "${API_URL}/templates/${TEMPLATE_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "高级管理人员模板(更新版)",
    "description": "适用于高级管理人员的工资模板 - 已更新",
    "fields": "{\"basic_salary\":{\"name\":\"基本工资\",\"type\":\"number\"},\"performance\":{\"name\":\"绩效奖金\",\"type\":\"number\"},\"housing\":{\"name\":\"住房补贴\",\"type\":\"number\"},\"communication\":{\"name\":\"通讯补贴\",\"type\":\"number\"},\"bonus\":{\"name\":\"年终奖\",\"type\":\"number\"},\"tax\":{\"name\":\"个人所得税\",\"type\":\"number\"},\"social_insurance\":{\"name\":\"社保\",\"type\":\"number\"}}",
    "is_active": true
  }' | python3 -m json.tool | head -10

# 4. Create a payroll using the new template
echo -e "\n4. Creating a payroll with the new template..."
curl -s -X POST "${API_URL}/payrolls" \
  -H "Content-Type: application/json" \
  -d "{
    \"employee_id\": 1,
    \"period\": \"2025-08\",
    \"template_id\": ${TEMPLATE_ID},
    \"is_prorated\": false,
    \"work_days\": 22,
    \"month_days\": 22,
    \"payroll_data\": {
      \"basic_salary\": 20000,
      \"performance\": 5000,
      \"housing\": 3000,
      \"communication\": 500,
      \"bonus\": 0,
      \"tax\": 3500,
      \"social_insurance\": 2000
    }
  }" | python3 -m json.tool | head -15

# 5. Test delete template (should disable if in use)
echo -e "\n5. Testing delete template (should disable since it's in use)..."
curl -s -X DELETE "${API_URL}/templates/${TEMPLATE_ID}" | python3 -m json.tool

echo -e "\n=== Template Management Test Complete ==="
echo "Please check http://localhost:40010/web/admin.html to verify the UI functionality."