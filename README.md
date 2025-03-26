# 📌 Leave Management System (AWS Lambda + DynamoDB + SES)

A serverless Leave Management System built using AWS Lambda, DynamoDB, and SES. It allows employees to apply for leave, and managers to approve or reject leave requests via email notifications.

---

## 🚀 Tech Stack

- **Backend:** AWS Lambda (Node.js + TypeScript)
- **Database:** Amazon DynamoDB
- **Email Service:** AWS SES (Simple Email Service)
- **API Gateway:** RESTful API

---

## 🛠 Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/gnanaprakas02/Prakash-leavement-api.git
cd leave-management-system
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Set Up AWS Credentials
Ensure your AWS CLI is configured with the necessary permissions:
```bash
aws configure
```

### 4️⃣ Modify the Environment Variables
Create or update the `.env` file:
```
TABLE_NAME=your-dynamodb-table
SES_EMAIL=your-verified-email@example.com
```

### 5️⃣ Deploy to AWS
```bash
sam deploy
```

### 6️⃣ Generate a JWT Token
```bash
cd hello-world
npx tsc generatetoken.ts
node generatetoken.js
```

---

## 📌 API Details

### 1️⃣ Apply for Leave
- **Endpoint:** `POST /apply-leave`
- **Request Body:**
```json
{
  "userEmail": "user@example.com",
  "startDate": "2025-03-25",
  "endDate": "2025-03-25",
  "approverEmail": "manager@example.com",
  "leaveType": "string"
}
```
- **Response:**
```json
{
  "message": "Leave applied",
  "requestId": "LEAVE-1710000000000"
}
```

### 2️⃣ Approve Leave
- **Endpoint:** `PUT /approve-leave`
- **Request Body:**
```json
{
  "requestId": "LEAVE-1710000000000",
  "approved": true
}
```
- **Response:**
```json
{
  "message": "Leave status updated"
}
```

---

## 📧 Email Notification Workflow
✔ Employee applies for leave → Manager receives an approval email via AWS SES  
✔ Manager approves/rejects the request → Employee receives a notification email

---

🎉 **Your Leave Management System is now set up and ready to use!**

