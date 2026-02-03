import { RBACService } from './rbacService';
import { AuthService } from './authService';
import { Permission } from '../types/rbac';

export interface APIRequest {
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  userId?: string;
}

export interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
}

export class APIMiddleware {
  private static instance: APIMiddleware;
  private rbacService: RBACService;
  private authService: AuthService;

  static getInstance(): APIMiddleware {
    if (!APIMiddleware.instance) {
      APIMiddleware.instance = new APIMiddleware();
    }
    return APIMiddleware.instance;
  }

  constructor() {
    this.rbacService = RBACService.getInstance();
    this.authService = AuthService.getInstance();
  }

  // Main middleware function to check API access
  async checkAPIAccess(request: APIRequest): Promise<{ allowed: boolean; response?: APIResponse }> {
    try {
      // Check if endpoint is public
      const endpoints = this.rbacService.getAPIEndpoints();
      const endpoint = endpoints.find(ep => 
        this.matchPath(ep.path, request.path) && 
        ep.method === request.method.toUpperCase()
      );

      if (!endpoint) {
        return {
          allowed: false,
          response: {
            success: false,
            error: 'Endpoint not found',
            statusCode: 404
          }
        };
      }

      if (endpoint.isPublic) {
        return { allowed: true };
      }

      // Check authentication
      if (!request.userId) {
        return {
          allowed: false,
          response: {
            success: false,
            error: 'Authentication required',
            statusCode: 401
          }
        };
      }

      // Verify user exists and is active
      const user = this.authService.getUserById(request.userId);
      if (!user || !user.isActive) {
        return {
          allowed: false,
          response: {
            success: false,
            error: 'User not found or inactive',
            statusCode: 401
          }
        };
      }

      // Check RBAC permissions
      const accessCheck = this.rbacService.checkAPIAccess(request.userId, request.path, request.method);
      if (!accessCheck.allowed) {
        return {
          allowed: false,
          response: {
            success: false,
            error: accessCheck.reason || 'Access denied',
            statusCode: 403
          }
        };
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        response: {
          success: false,
          error: 'Internal server error',
          statusCode: 500
        }
      };
    }
  }

  // Helper function to match API paths with parameters
  private matchPath(pattern: string, path: string): boolean {
    // Convert pattern like '/api/users/:id' to regex
    const regexPattern = pattern
      .replace(/:[^/]+/g, '[^/]+') // Replace :id with [^/]+
      .replace(/\//g, '\\/'); // Escape forward slashes
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  // Simulate API calls with RBAC checking
  async simulateAPICall(request: APIRequest): Promise<APIResponse> {
    const accessCheck = await this.checkAPIAccess(request);
    
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    // Simulate successful API response based on endpoint
    return this.generateMockResponse(request);
  }

  // Generate mock responses for different endpoints
  private generateMockResponse(request: APIRequest): APIResponse {
    const { path, method } = request;

    // Patient endpoints
    if (path.includes('/api/patients/profile') && method === 'GET') {
      return {
        success: true,
        data: {
          id: request.userId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          role: 'patient'
        },
        statusCode: 200
      };
    }

    if (path.includes('/api/patients/appointments') && method === 'GET') {
      return {
        success: true,
        data: [
          {
            id: 'APT001',
            doctorName: 'Dr. Smith',
            date: '2024-02-05',
            time: '10:00 AM',
            status: 'scheduled'
          }
        ],
        statusCode: 200
      };
    }

    // Doctor endpoints
    if (path.includes('/api/doctors/patients') && method === 'GET') {
      return {
        success: true,
        data: [
          {
            id: 'PAT001',
            name: 'Jane Smith',
            age: 35,
            lastVisit: '2024-01-15'
          }
        ],
        statusCode: 200
      };
    }

    // Pharmacy endpoints
    if (path.includes('/api/pharmacy/prescriptions') && method === 'GET') {
      return {
        success: true,
        data: [
          {
            id: 'RX001',
            patientName: 'John Doe',
            medications: ['Paracetamol 500mg'],
            status: 'pending'
          }
        ],
        statusCode: 200
      };
    }

    // Admin endpoints
    if (path.includes('/api/admin/users') && method === 'GET') {
      return {
        success: true,
        data: this.authService.getAllUsers().map(user => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        })),
        statusCode: 200
      };
    }

    // Default response
    return {
      success: true,
      data: { message: 'API call successful' },
      statusCode: 200
    };
  }

  // Test RBAC system with various scenarios
  async testRBACScenarios(): Promise<{
    scenario: string;
    request: APIRequest;
    result: APIResponse;
  }[]> {
    const scenarios = [
      // Public endpoint test
      {
        scenario: 'Public endpoint access',
        request: {
          path: '/api/auth/login',
          method: 'POST'
        }
      },
      // Patient accessing their profile
      {
        scenario: 'Patient accessing own profile',
        request: {
          path: '/api/patients/profile',
          method: 'GET',
          userId: 'PAT001'
        }
      },
      // Patient trying to access admin endpoint
      {
        scenario: 'Patient accessing admin endpoint (should fail)',
        request: {
          path: '/api/admin/users',
          method: 'GET',
          userId: 'PAT001'
        }
      },
      // Doctor accessing patient records
      {
        scenario: 'Doctor accessing patient records',
        request: {
          path: '/api/doctors/patients/PAT001',
          method: 'GET',
          userId: 'DOC001'
        }
      },
      // Pharmacy accessing prescriptions
      {
        scenario: 'Pharmacy accessing prescriptions',
        request: {
          path: '/api/pharmacy/prescriptions',
          method: 'GET',
          userId: 'PHR001'
        }
      },
      // Admin accessing all users
      {
        scenario: 'Admin accessing all users',
        request: {
          path: '/api/admin/users',
          method: 'GET',
          userId: 'ADM001'
        }
      },
      // Unauthenticated access
      {
        scenario: 'Unauthenticated access (should fail)',
        request: {
          path: '/api/patients/profile',
          method: 'GET'
        }
      }
    ];

    const results = [];
    for (const scenario of scenarios) {
      const result = await this.simulateAPICall(scenario.request);
      results.push({
        scenario: scenario.scenario,
        request: scenario.request,
        result
      });
    }

    return results;
  }

  // Utility method to create test users for RBAC testing
  createTestUsers(): void {
    const testUsers = [
      {
        email: 'patient@test.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'Test',
        lastName: 'Patient',
        phone: '9876543210',
        role: 'patient' as const,
        village: 'Test Village'
      },
      {
        email: 'doctor@test.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'Test',
        lastName: 'Doctor',
        phone: '9876543211',
        role: 'doctor' as const,
        specialization: 'General Medicine',
        licenseNumber: 'DOC123'
      },
      {
        email: 'pharmacy@test.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'Test',
        lastName: 'Pharmacy',
        phone: '9876543212',
        role: 'pharmacy' as const
      },
      {
        email: 'admin@test.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'Test',
        lastName: 'Admin',
        phone: '9876543213',
        role: 'admin' as const
      }
    ];

    testUsers.forEach(async (userData) => {
      const result = await this.authService.register(userData);
      if (result.success && result.user) {
        // Assign RBAC role
        this.rbacService.assignRole(result.user.id, userData.role, 'system');
        console.log(`Created test user: ${userData.email} with role: ${userData.role}`);
      }
    });
  }
}