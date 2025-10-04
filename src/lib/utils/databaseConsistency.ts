import connectDB from '../db';
import Interview from '../models/Interview';
import User from '../models/User';
import Company from '../models/Company';
import mongoose from 'mongoose';

export interface ConsistencyReport {
  isValid: boolean;
  issues: string[];
  fixed: number;
}

/**
 * Check and fix database consistency issues
 */
export async function checkAndFixDatabaseConsistency(): Promise<ConsistencyReport> {
  await connectDB();
  
  const issues: string[] = [];
  let fixed = 0;

  try {
    // Check 1: Fix duplicate queue positions
    const duplicatePositions = await fixDuplicateQueuePositions();
    if (duplicatePositions > 0) {
      issues.push(`Fixed ${duplicatePositions} duplicate queue positions`);
      fixed += duplicatePositions;
    }

    // Check 2: Fix orphaned interviews
    const orphanedInterviews = await fixOrphanedInterviews();
    if (orphanedInterviews > 0) {
      issues.push(`Fixed ${orphanedInterviews} orphaned interviews`);
      fixed += orphanedInterviews;
    }

    // Check 3: Fix invalid queue positions
    const invalidPositions = await fixInvalidQueuePositions();
    if (invalidPositions > 0) {
      issues.push(`Fixed ${invalidPositions} invalid queue positions`);
      fixed += invalidPositions;
    }

    // Check 4: Fix missing queue positions
    const missingPositions = await fixMissingQueuePositions();
    if (missingPositions > 0) {
      issues.push(`Fixed ${missingPositions} missing queue positions`);
      fixed += missingPositions;
    }

    // Check 5: Fix inconsistent interview statuses
    const inconsistentStatuses = await fixInconsistentStatuses();
    if (inconsistentStatuses > 0) {
      issues.push(`Fixed ${inconsistentStatuses} inconsistent interview statuses`);
      fixed += inconsistentStatuses;
    }

    return {
      isValid: issues.length === 0,
      issues,
      fixed
    };
  } catch (error) {
    console.error('Error during consistency check:', error);
    return {
      isValid: false,
      issues: [`Consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      fixed: 0
    };
  }
}

/**
 * Fix duplicate queue positions within the same company
 */
async function fixDuplicateQueuePositions(): Promise<number> {
  let fixed = 0;

  // Get all companies with waiting interviews
  const companies = await Interview.distinct('companyId', { status: 'waiting' });

  for (const companyId of companies) {
    // Get all waiting interviews for this company
    const interviews = await Interview.find({
      companyId,
      status: 'waiting'
    }).sort({ priorityScore: 1, joinedAt: 1 });

    // Check for duplicates and fix them
    const seenPositions = new Set<number>();
    const duplicates: any[] = [];

    for (const interview of interviews) {
      if (seenPositions.has(interview.queuePosition)) {
        duplicates.push(interview);
      } else {
        seenPositions.add(interview.queuePosition);
      }
    }

    // Fix duplicates by reassigning positions
    if (duplicates.length > 0) {
      let nextPosition = interviews.length - duplicates.length + 1;
      
      for (const duplicate of duplicates) {
        await Interview.findByIdAndUpdate(duplicate._id, {
          queuePosition: nextPosition,
          updatedAt: new Date()
        });
        nextPosition++;
        fixed++;
      }
    }
  }

  return fixed;
}

/**
 * Fix orphaned interviews (interviews without valid students or companies)
 */
async function fixOrphanedInterviews(): Promise<number> {
  let fixed = 0;

  // Find interviews with invalid student references
  const interviews = await Interview.find({});
  
  for (const interview of interviews) {
    const student = await User.findById(interview.studentId);
    const company = await Company.findById(interview.companyId);

    if (!student || !company) {
      // Mark orphaned interview as cancelled
      await Interview.findByIdAndUpdate(interview._id, {
        status: 'cancelled',
        updatedAt: new Date()
      });
      fixed++;
    }
  }

  return fixed;
}

/**
 * Fix invalid queue positions (negative, zero, or non-integer)
 */
async function fixInvalidQueuePositions(): Promise<number> {
  let fixed = 0;

  const invalidInterviews = await Interview.find({
    status: 'waiting',
    $or: [
      { queuePosition: { $lte: 0 } },
      { queuePosition: { $not: { $type: 'int' } } }
    ]
  });

  for (const interview of invalidInterviews) {
    // Get the correct position based on priority
    const correctPosition = await Interview.countDocuments({
      companyId: interview.companyId,
      status: 'waiting',
      $or: [
        { priorityScore: { $lt: interview.priorityScore } },
        { 
          priorityScore: interview.priorityScore,
          joinedAt: { $lt: interview.joinedAt }
        }
      ]
    }) + 1;

    await Interview.findByIdAndUpdate(interview._id, {
      queuePosition: correctPosition,
      updatedAt: new Date()
    });
    fixed++;
  }

  return fixed;
}

/**
 * Fix missing queue positions
 */
async function fixMissingQueuePositions(): Promise<number> {
  let fixed = 0;

  const interviewsWithoutPositions = await Interview.find({
    status: 'waiting',
    $or: [
      { queuePosition: { $exists: false } },
      { queuePosition: null }
    ]
  });

  for (const interview of interviewsWithoutPositions) {
    // Calculate position based on priority
    const position = await Interview.countDocuments({
      companyId: interview.companyId,
      status: 'waiting',
      $or: [
        { priorityScore: { $lt: interview.priorityScore } },
        { 
          priorityScore: interview.priorityScore,
          joinedAt: { $lt: interview.joinedAt }
        }
      ]
    }) + 1;

    await Interview.findByIdAndUpdate(interview._id, {
      queuePosition: position,
      updatedAt: new Date()
    });
    fixed++;
  }

  return fixed;
}

/**
 * Fix inconsistent interview statuses
 */
async function fixInconsistentStatuses(): Promise<number> {
  let fixed = 0;

  // Fix interviews that are marked as in_progress but don't have startedAt
  const inconsistentInProgress = await Interview.find({
    status: 'in_progress',
    startedAt: { $exists: false }
  });

  for (const interview of inconsistentInProgress) {
    await Interview.findByIdAndUpdate(interview._id, {
      startedAt: new Date(),
      updatedAt: new Date()
    });
    fixed++;
  }

  // Fix interviews that are marked as completed but don't have completedAt
  const inconsistentCompleted = await Interview.find({
    status: 'completed',
    completedAt: { $exists: false }
  });

  for (const interview of inconsistentCompleted) {
    await Interview.findByIdAndUpdate(interview._id, {
      completedAt: new Date(),
      updatedAt: new Date()
    });
    fixed++;
  }

  // Fix interviews that are marked as passed but don't have passedAt
  const inconsistentPassed = await Interview.find({
    status: 'passed',
    passedAt: { $exists: false }
  });

  for (const interview of inconsistentPassed) {
    await Interview.findByIdAndUpdate(interview._id, {
      passedAt: new Date(),
      updatedAt: new Date()
    });
    fixed++;
  }

  return fixed;
}

/**
 * Validate queue integrity for a specific company
 */
export async function validateQueueIntegrity(companyId: string): Promise<{
  isValid: boolean;
  issues: string[];
}> {
  await connectDB();
  
  const issues: string[] = [];

  try {
    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      issues.push('Company does not exist');
      return { isValid: false, issues };
    }

    // Get all waiting interviews for this company
    const waitingInterviews = await Interview.find({
      companyId,
      status: 'waiting'
    }).sort({ queuePosition: 1 });

    // Check for gaps in queue positions
    for (let i = 0; i < waitingInterviews.length; i++) {
      const expectedPosition = i + 1;
      const actualPosition = waitingInterviews[i].queuePosition;
      
      if (actualPosition !== expectedPosition) {
        issues.push(`Queue position gap: expected ${expectedPosition}, got ${actualPosition}`);
      }
    }

    // Check for duplicate positions
    const positions = waitingInterviews.map(i => i.queuePosition);
    const uniquePositions = new Set(positions);
    if (positions.length !== uniquePositions.size) {
      issues.push('Duplicate queue positions found');
    }

    // Check if positions are in correct order based on priority
    for (let i = 1; i < waitingInterviews.length; i++) {
      const current = waitingInterviews[i];
      const previous = waitingInterviews[i - 1];
      
      if (current.priorityScore < previous.priorityScore) {
        issues.push('Queue not ordered by priority score');
        break;
      } else if (current.priorityScore === previous.priorityScore && 
                 current.joinedAt < previous.joinedAt) {
        issues.push('Queue not ordered by join time for equal priority scores');
        break;
      }
    }

    // Check for multiple in-progress interviews
    const inProgressInterviews = await Interview.countDocuments({
      companyId,
      status: 'in_progress'
    });

    if (inProgressInterviews > 1) {
      issues.push(`Multiple interviews in progress: ${inProgressInterviews}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  } catch (error) {
    return {
      isValid: false,
      issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}
