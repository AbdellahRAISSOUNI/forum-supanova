/**
 * Optimized queue service for high-traffic scenarios
 * Implements batching, caching, and simplified operations
 */

import mongoose from 'mongoose';
import connectDB from '../db';
import User from '../models/User';
import Company from '../models/Company';
import Interview from '../models/Interview';
import { cache, CACHE_KEYS } from '../cache';
import { withTransaction } from '../utils/transactions';

// Cache queue data for 5 seconds to reduce database load
const QUEUE_CACHE_TTL = 5000;

/**
 * Optimized queue joining with minimal database operations
 */
export async function joinQueueOptimized(
  studentId: string,
  companyId: string,
  opportunityType: string
): Promise<{
  success: boolean;
  message: string;
  position?: number;
  interviewId?: string;
}> {
  try {
    await connectDB();

    // Input sanitization
    const sanitizedStudentId = studentId.trim();
    const sanitizedCompanyId = companyId.trim();
    const sanitizedOpportunityType = opportunityType.trim();

    if (!mongoose.Types.ObjectId.isValid(sanitizedStudentId) || 
        !mongoose.Types.ObjectId.isValid(sanitizedCompanyId)) {
      return {
        success: false,
        message: 'ID invalide'
      };
    }

    // Use transaction for atomicity
    return await withTransaction(async (session) => {
      // Batch query: get student and company in one operation
      const [student, company] = await Promise.all([
        User.findById(sanitizedStudentId).select('role studentStatus').session(session),
        Company.findById(sanitizedCompanyId).select('isActive name').session(session)
      ]);

      if (!student || student.role !== 'student') {
        return { success: false, message: 'Étudiant non trouvé ou non autorisé' };
      }

      if (!company || !company.isActive) {
        return { success: false, message: 'Entreprise non disponible' };
      }

      // Check for existing interview (simplified check)
      const existingInterview = await Interview.findOne({
        studentId: sanitizedStudentId,
        companyId: sanitizedCompanyId,
        status: { $in: ['waiting', 'in_progress'] }
      }).select('_id').session(session);

      if (existingInterview) {
        return { success: false, message: 'Vous êtes déjà dans cette file d\'attente' };
      }

      // Get current queue length (cached)
      const queueLength = await getQueueLengthCached(sanitizedCompanyId, session);

      // Create interview with minimal data
      const interview = await Interview.create([{
        studentId: sanitizedStudentId,
        companyId: sanitizedCompanyId,
        opportunityType: sanitizedOpportunityType,
        status: 'waiting',
        queuePosition: queueLength + 1,
        priorityScore: calculateSimplePriority(student, sanitizedOpportunityType),
        joinedAt: new Date()
      }], { session });

      // Invalidate queue cache
      cache.delete(`queue:${sanitizedCompanyId}`);

      return {
        success: true,
        message: 'Ajouté à la file d\'attente avec succès',
        position: queueLength + 1,
        interviewId: interview[0]._id.toString()
      };
    });

  } catch (error) {
    console.error('Error in joinQueueOptimized:', error);
    return {
      success: false,
      message: 'Erreur lors de l\'ajout à la file d\'attente'
    };
  }
}

/**
 * Get queue length with caching
 */
async function getQueueLengthCached(
  companyId: string,
  session: mongoose.ClientSession
): Promise<number> {
  const cacheKey = `queue:length:${companyId}`;
  let queueLength = cache.get<number>(cacheKey);

  if (queueLength === null) {
    queueLength = await Interview.countDocuments({
      companyId,
      status: 'waiting'
    }).session(session);
    
    // Cache for 10 seconds
    cache.set(cacheKey, queueLength, 10000);
  }

  return queueLength;
}

/**
 * Simplified priority calculation
 */
function calculateSimplePriority(student: any, opportunityType: string): number {
  let score = 100;

  // ENSA students get higher priority
  if (student.studentStatus === 'ensa') {
    score += 50;
  }

  // Different opportunity types have different priorities
  switch (opportunityType) {
    case 'employment':
      score += 30;
      break;
    case 'pfe':
      score += 20;
      break;
    case 'pfa':
      score += 10;
      break;
    case 'observation':
      score += 5;
      break;
  }

  return score;
}

/**
 * Optimized queue retrieval with caching
 */
export async function getQueueOptimized(
  companyId: string,
  limit: number = 50
): Promise<{
  queue: any[];
  total: number;
  currentInterview?: any;
}> {
  try {
    const cacheKey = `queue:${companyId}:${limit}`;
    let cachedData = cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    await connectDB();

    // Get queue data with optimized query
    const [queue, currentInterview] = await Promise.all([
      Interview.find({
        companyId,
        status: 'waiting'
      })
      .populate('studentId', 'firstName name studentStatus')
      .select('_id queuePosition priorityScore joinedAt opportunityType studentId')
      .sort({ priorityScore: 1, joinedAt: 1 })
      .limit(limit)
      .lean(),

      Interview.findOne({
        companyId,
        status: 'in_progress'
      })
      .populate('studentId', 'firstName name studentStatus')
      .select('_id startedAt studentId')
      .lean()
    ]);

    const result = {
      queue: queue.map((interview: any) => ({
        interviewId: interview._id.toString(),
        studentName: `${interview.studentId.firstName} ${interview.studentId.name}`,
        studentStatus: interview.studentId.studentStatus,
        position: interview.queuePosition,
        opportunityType: interview.opportunityType,
        joinedAt: interview.joinedAt,
        priorityScore: interview.priorityScore
      })),
      total: queue.length,
      currentInterview: currentInterview ? {
        interviewId: currentInterview._id.toString(),
        studentName: `${currentInterview.studentId.firstName} ${currentInterview.studentId.name}`,
        startedAt: currentInterview.startedAt
      } : undefined
    };

    // Cache for 5 seconds
    cache.set(cacheKey, result, QUEUE_CACHE_TTL);

    return result;

  } catch (error) {
    console.error('Error in getQueueOptimized:', error);
    return {
      queue: [],
      total: 0
    };
  }
}

/**
 * Optimized student queues retrieval
 */
export async function getStudentQueuesOptimized(studentId: string): Promise<any[]> {
  try {
    const cacheKey = `student:queues:${studentId}`;
    let cachedQueues = cache.get<any[]>(cacheKey);

    if (cachedQueues) {
      return cachedQueues;
    }

    await connectDB();

    const interviews = await Interview.find({
      studentId,
      status: { $in: ['waiting', 'in_progress'] }
    })
    .populate('companyId', 'name room')
    .select('_id companyId status queuePosition opportunityType joinedAt startedAt')
    .sort({ joinedAt: -1 })
    .lean();

    const queues = interviews.map((interview: any) => ({
      interviewId: interview._id.toString(),
      companyName: interview.companyId.name,
      room: interview.companyId.room,
      status: interview.status,
      position: interview.queuePosition,
      opportunityType: interview.opportunityType,
      joinedAt: interview.joinedAt,
      startedAt: interview.startedAt
    }));

    // Cache for 10 seconds
    cache.set(cacheKey, queues, 10000);

    return queues;

  } catch (error) {
    console.error('Error in getStudentQueuesOptimized:', error);
    return [];
  }
}

/**
 * Batch update queue positions (for admin operations)
 */
export async function batchUpdateQueuePositions(
  companyId: string
): Promise<{ success: boolean; updated: number }> {
  try {
    await connectDB();

    return await withTransaction(async (session) => {
      // Get all waiting interviews sorted by priority
      const interviews = await Interview.find({
        companyId,
        status: 'waiting'
      })
      .select('_id priorityScore joinedAt')
      .sort({ priorityScore: 1, joinedAt: 1 })
      .session(session);

      // Batch update positions
      const updatePromises = interviews.map((interview, index) =>
        Interview.findByIdAndUpdate(
          interview._id,
          { queuePosition: index + 1 },
          { session }
        )
      );

      await Promise.all(updatePromises);

      // Invalidate cache
      cache.delete(`queue:${companyId}`);
      cache.delete(`queue:length:${companyId}`);

      return {
        success: true,
        updated: interviews.length
      };
    });

  } catch (error) {
    console.error('Error in batchUpdateQueuePositions:', error);
    return { success: false, updated: 0 };
  }
}
