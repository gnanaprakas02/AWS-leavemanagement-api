Leave Management Application
Here’s a well-structured GitHub README file for your project, including a visually appealing format, API endpoints, request/response details, and setup instructions.

📌 Leave Management System (AWS Lambda + DynamoDB + SES)
A serverless Leave Management System built using AWS Lambda, DynamoDB, and SES. It allows employees to apply for leave, and managers to approve or reject leave requests via email notifications.

🚀 Tech Stack
Backend: AWS Lambda (Node.js + TypeScript)
Database: Amazon DynamoDB
Email Service: AWS SES (Simple Email Service)
API Gateway: RESTful API


🛠 Installation & Setup
1️⃣ Clone the Repository

git clone https://github.com/gnanaprakas02/Prakash-leavement-api.git
cd leave-management-system

2️⃣ Install Dependencies
npm install
3️⃣ Set Up AWS Credentials
Ensure your AWS CLI is configured with necessary permissions:

aws configure
4️⃣ Deploy to AWS
Modify .env file:

TABLE_NAME=your-dynamodb-table
SES_EMAIL=your-verified-email@example.com


Then deploy:

sam deploy


📌 API Details
1️⃣ Apply for Leave
Endpoint:

POST /apply-leave

{
  "userEmail": "user@example.com",
  "startDate": "2025-03-25",
  "endDate": "2025-03-25",
  "approverEmail": "user@example.com",
  "leaveType": "string"
}

Response:

{
  "message": "Leave applied",
  "requestId": "LEAVE-1710000000000"
}


2️⃣ Approve Leave
Endpoint:

PUT /approve-leave
Request Body:

{
  "requestId": "LEAVE-1710000000000",
  "approved": true
}
Response:

{
  "message": "Leave status updated"
}

📧 Email Notification Workflow
✔ Employee applies for leave → Manager receives an approval email via AWS SES
✔ Manager approves/rejects the request → Employee receives a notification email
