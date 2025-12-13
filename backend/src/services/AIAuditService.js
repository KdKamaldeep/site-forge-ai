import AIAudit from '../models/AIAudit.js';

export class AIAuditService {
  /**
   * Log an AI service call
   */
  static async logCall(data) {
    try {
      const {
        tenantId = null,
        service,
        operation,
        status,
        error = null,
        errorStack = null,
        requestData = {},
        responseData = {},
        duration = null,
        tokensUsed = null,
        estimatedCost = null,
        metadata = {}
      } = data;

      // Don't log if service is not provided
      if (!service || !operation || !status) {
        console.warn('AIAuditService: Missing required fields', { service, operation, status });
        return null;
      }

      const audit = await AIAudit.create({
        tenantId,
        service,
        operation,
        status,
        error: error?.message || error || null,
        errorStack: error?.stack || errorStack || null,
        requestData,
        responseData,
        duration,
        tokensUsed,
        estimatedCost,
        metadata
      });

      return audit;
    } catch (error) {
      // Don't throw - audit logging should never break the main flow
      console.error('Error logging AI audit:', error);
      return null;
    }
  }

  /**
   * Log successful AI call
   */
  static async logSuccess(data) {
    return await this.logCall({
      ...data,
      status: 'success'
    });
  }

  /**
   * Log failed AI call
   */
  static async logFailure(data) {
    return await this.logCall({
      ...data,
      status: 'failed'
    });
  }

  /**
   * Log partial success (some operations succeeded, some failed)
   */
  static async logPartial(data) {
    return await this.logCall({
      ...data,
      status: 'partial'
    });
  }

  /**
   * Get audit logs with filters
   */
  static async getLogs(filters = {}) {
    const {
      tenantId = null,
      service = null,
      status = null,
      operation = null,
      startDate = null,
      endDate = null,
      limit = 100,
      skip = 0
    } = filters;

    const query = {};

    if (tenantId) query.tenantId = tenantId;
    if (service) query.service = service;
    if (status) query.status = status;
    if (operation) query.operation = operation;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AIAudit.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('tenantId', 'name domain');

    const total = await AIAudit.countDocuments(query);

    return {
      logs,
      total,
      limit,
      skip
    };
  }

  /**
   * Get statistics
   */
  static async getStatistics(filters = {}) {
    const { tenantId = null, startDate = null, endDate = null } = filters;

    const query = {};
    if (tenantId) query.tenantId = tenantId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const stats = await AIAudit.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          successCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          partialCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] }
          },
          totalTokens: { $sum: { $ifNull: ['$tokensUsed', 0] } },
          totalCost: { $sum: { $ifNull: ['$estimatedCost', 0] } },
          avgDuration: { $avg: { $ifNull: ['$duration', 0] } }
        }
      }
    ]);

    const byService = await AIAudit.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$service',
          count: { $sum: 1 },
          success: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    const byOperation = await AIAudit.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$operation',
          count: { $sum: 1 },
          success: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    return {
      overall: stats[0] || {
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0,
        partialCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        avgDuration: 0
      },
      byService,
      byOperation
    };
  }
}

