import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SFNClient, StartExecutionCommand, SendTaskSuccessCommand } from "@aws-sdk/client-sfn";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken"; // Added for JWT validation

const dynamo = new DynamoDBClient({});
const ses = new SESClient({});
const sfn = new SFNClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const SES_EMAIL = process.env.SES_EMAIL!;
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN!;
const JWT_SECRET = process.env.JWT_SECRET!; // Added for JWT

// Apply for Leave - Triggers Step Functions with JWT Authentication
export const applyLeave = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Check for Authorization header
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "invalid Authorization" })
            };
        }

        // Extract and verify JWT
        const token = authHeader.split(" ")[1];
        try {
            const decodedToken = jwt.verify(token, JWT_SECRET);
            console.log("Token validated:", decodedToken);
        } catch (err) {
            console.error("JWT verification failed:", err);
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Invalid or expired token" })
            };
        }

        if (!TABLE_NAME || !SES_EMAIL || !STATE_MACHINE_ARN) {
            throw new Error("Missing required environment variables");
        }

        const body = JSON.parse(event.body || "{}");
        if (!body.userEmail || !body.startDate || !body.endDate || !body.approverEmail || !body.leaveType) {
            return { statusCode: 400, body: JSON.stringify({ message: "Missing required fields" }) };
        }

        const requestId = `LEAVE-${Date.now()}`;
        console.log("Applying leave for:", body.userEmail, "Request ID:", requestId);

        // Store request in DynamoDB
        await dynamo.send(new PutItemCommand({
            TableName: TABLE_NAME,
            Item: {
                requestId: { S: requestId },
                userEmail: { S: body.userEmail },
                approverEmail: { S: body.approverEmail },
                startDate: { S: body.startDate },
                endDate: { S: body.endDate },
                leaveType: { S: body.leaveType },
                status: { S: "PENDING" }
            }
        }));

        // Extract API URL from event
        const apiBaseUrl = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;

        // Start Step Functions execution
        const input = {
            requestId,
            userEmail: body.userEmail,
            approverEmail: body.approverEmail,
            leaveDetails: {
                startDate: body.startDate,
                endDate: body.endDate,
                leaveType: body.leaveType 
            },
            apiBaseUrl
        };

        await sfn.send(new StartExecutionCommand({
            stateMachineArn: STATE_MACHINE_ARN,
            input: JSON.stringify(input)
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Leave applied", requestId })
        };
    } catch (error) {
        console.error("Error in applyLeave:", error);
        return { statusCode: 500, body: JSON.stringify({ message: "Internal server error" }) };
    }
};

// ... (rest of your functions: sendApprovalEmail, processApproval, notifyUser)

// Send Approval Email - Sends email with buttons and task token
export const sendApprovalEmail = async (event: any): Promise<void> => {
    try {
        const { requestId, userEmail, approverEmail, leaveDetails, taskToken, apiBaseUrl } = event;

        // Generate approval/rejection URLs with task token
        const approveUrl = `${apiBaseUrl}/process-approval?requestId=${requestId}&action=approve&taskToken=${encodeURIComponent(taskToken)}`;
        const rejectUrl = `${apiBaseUrl}/process-approval?requestId=${requestId}&action=reject&taskToken=${encodeURIComponent(taskToken)}`;
        const statusUrl = `${apiBaseUrl}/check-leave-status?requestId=${requestId}`; // New: Track Status URL

        const startDate = new Date(leaveDetails.startDate);
        const endDate = new Date(leaveDetails.endDate);
        const leaveDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1);

        const emailParams = {
            Destination: { ToAddresses: [approverEmail] },
            Message: {
                Body: {
                    Html: {
                        Data: `
                            <p><b>New Leave Request</b></p>
                            <p><b>From:</b> ${userEmail}</p>
                            <p><b>Leave Type:</b> ${leaveDetails.leaveType}</p>
                            <p><b>Start Date:</b> ${leaveDetails.startDate}</p>
                            <p><b>End Date:</b> ${leaveDetails.endDate}</p>
                            <p><b>Duration:</b> ${leaveDuration} days</p>
                            <p>
                                <a href="${approveUrl}" onclick="return confirm('Are you sure you want to approve this leave request?');">
                                    <button style="background-color: green; color: white; border: none; padding: 10px 20px; cursor: pointer;">✅ Approve</button>
                                </a>
                                &nbsp;
                                <a href="${rejectUrl}" onclick="return confirm('Are you sure you want to reject this leave request?');">
                                    <button style="background-color: red; color: white; border: none; padding: 10px 20px; cursor: pointer;">❌ Reject</button>
                                </a>
                            </p>
                            <p><a href="${statusUrl}">🔍 Track Leave Status</a></p>
                        `
                    }
                },
                Subject: { Data: "Leave Approval Request" }
            },
            Source: SES_EMAIL
        };

        console.log("Sending approval email for request:", requestId);
        await ses.send(new SendEmailCommand(emailParams));
    } catch (error) {
        console.error("Error in sendApprovalEmail:", error);
        throw error;
    }
};

// Process Approval - Handles button clicks and resumes Step Functions
export const processApproval = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const queryParams = event.queryStringParameters || {};
        const { requestId, action, taskToken } = queryParams;

        if (!requestId || !action || !taskToken) {
            return { statusCode: 400, body: JSON.stringify({ message: "Missing required query parameters" }) };
        }

        const approvalStatus = action === "approve" ? "APPROVED" : "REJECTED";
        console.log(`Processing ${approvalStatus} for request: ${requestId}`);

        // Resume Step Functions with the approval status
        await sfn.send(new SendTaskSuccessCommand({
            taskToken,
            output: JSON.stringify({ approvalStatus })
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Leave request ${requestId} ${approvalStatus.toLowerCase()}` })
        };
    } catch (error) {
        console.error("Error in processApproval:", error);
        return { statusCode: 500, body: JSON.stringify({ message: "Internal server error" }) };
    }
};

// Notify User - Sends final notification
export const notifyUser = async (event: any): Promise<void> => {
    try {
        const { requestId, userEmail, approvalStatus, leaveDetails } = event;

        const statusText = approvalStatus === "APPROVED" ? "✅ APPROVED" : "❌ REJECTED";
        const statusColor = approvalStatus === "APPROVED" ? "green" : "red";

        const emailParams = {
            Destination: { ToAddresses: [userEmail] },
            Message: {
                Body: {
                    Html: {
                        Data: `
                            <p><b>Your leave request (${requestId}) has been <span style="color: ${statusColor};">${statusText}</span></b></p>
                            <p><b>Leave Type:</b> ${leaveDetails.leaveType}</p>
                            <p><b>Start Date:</b> ${leaveDetails.startDate}</p>
                            <p><b>End Date:</b> ${leaveDetails.endDate}</p>
                        `
                    }
                },
                Subject: { Data: "Leave Request Outcome" }
            },
            Source: SES_EMAIL
        };

        console.log("Notifying user:", userEmail, "Status:", statusText);
        await ses.send(new SendEmailCommand(emailParams));
    } catch (error) {
        console.error("Error in notifyUser:", error);
        throw error;
    }
};
