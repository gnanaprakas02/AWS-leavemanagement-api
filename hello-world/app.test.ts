import { applyLeave, processApproval, notifyUser } from "./app";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SFNClient, StartExecutionCommand, SendTaskSuccessCommand } from "@aws-sdk/client-sfn";
import * as jwt from "jsonwebtoken";
import { request } from "http";

// ✅ FIX: Properly mock jwt.verify using `jest.mock`
jest.mock("jsonwebtoken", () => ({
    verify: jest.fn(() => ({ email: "test@example.com" }))
}));

// Mock AWS SDK clients
const dynamoMock = mockClient(DynamoDBClient);
const sesMock = mockClient(SESClient);
const sfnMock = mockClient(SFNClient);

// process.env.TABLE_NAME = "test-table";
// process.env.SES_EMAIL = "gnanaprakash.yarva@antstack.io";
// process.env.STATE_MACHINE_ARN = "test-state-machine";
// process.env.JWT_SECRET = "test-secret";

describe("applyLeave Function", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        dynamoMock.reset();
        sesMock.reset();
        sfnMock.reset();
        process.env.TABLE_NAME = "test-table";
        process.env.SES_EMAIL = "gnanaprakash.yarva@antstack.io";
        process.env.STATE_MACHINE_ARN = "test-state-machine";
        process.env.JWT_SECRET = "test-secret";
    });

    it("should return 400 if required fields are missing", async () => {
        const event = {
            headers: { Authorization: "Bearer valid_token" },
            body: JSON.stringify({})
        } as any;

        const response = await applyLeave(event);
        console.log("Response:", response);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).message).toBe("Missing required fields");
    });

    it("should successfully store leave request and trigger step functions", async () => {
        dynamoMock.on(PutItemCommand).resolves({});
        sfnMock.on(StartExecutionCommand).resolves({ executionArn: "test-execution" });

        const event = {
            headers: { Authorization: "Bearer valid_token" },
            requestContext: {domainName: "test.io", stage:"test"},
            body: JSON.stringify({
                userEmail: "user@example.com",
                startDate: "2025-04-01",
                endDate: "2025-04-05",
                approverEmail: "approver@example.com",
                leaveType: "Sick"
            })
        } as any;

        const response = await applyLeave(event);
        console.log("Response:", response);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).message).toBe("Leave applied");
    });
});


describe("processApproval Function", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.resetAllMocks();
        sfnMock.reset();
    });

    it("should return 400 if query parameters are missing", async () => {
        const event = { queryStringParameters: {} } as any;
        const response = await processApproval(event);
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).message).toBe("Missing required query parameters");
    });

    it("should successfully process leave approval", async () => {
        sfnMock.on(SendTaskSuccessCommand).resolves({});

        const event = {
            queryStringParameters: {
                requestId: "LEAVE-12345",
                action: "approve",
                taskToken: "test-token"
            }
        } as any;

        const response = await processApproval(event);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).message).toBe("Leave request LEAVE-12345 approved");
    });

    it("should successfully process leave rejection", async () => {
        sfnMock.on(SendTaskSuccessCommand).resolves({});

        const event = {
            queryStringParameters: {
                requestId: "LEAVE-12345",
                action: "reject",
                taskToken: "test-token"
            }
        } as any;

        const response = await processApproval(event);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).message).toBe("Leave request LEAVE-12345 rejected");
    });
});

describe("notifyUser Function", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.resetAllMocks();
        sesMock.reset();
    });

    it("should successfully send an approval email", async () => {
        sesMock.on(SendEmailCommand).resolves({});

        const event = {
            requestId: "LEAVE-12345",
            userEmail: "user@example.com",
            approvalStatus: "APPROVED",
            leaveDetails: {
                startDate: "2025-04-01",
                endDate: "2025-04-05",
                leaveType: "Sick"
            }
        };

        await notifyUser(event);
        expect(sesMock.calls().length).toBe(1);
    });

    it("should successfully send a rejection email", async () => {
        sesMock.on(SendEmailCommand).resolves({});

        const event = {
            requestId: "LEAVE-12345",
            userEmail: "user@example.com",
            approvalStatus: "REJECTED",
            leaveDetails: {
                startDate: "2025-04-01",
                endDate: "2025-04-05",
                leaveType: "Sick"
            }
        };

        await notifyUser(event);
        expect(sesMock.calls().length).toBe(1);
    });
});
