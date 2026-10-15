import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('job_id') || searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required query parameter: job_id',
          status: 'bad_request',
        },
        { status: 400 }
      );
    }

    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: `Job '${jobId}' was not found or has expired.`,
          status: 'not_found',
        },
        { status: 404 }
      );
    }

    const isCompleted =
      job.status === 'succeeded' ||
      (job.status as string) === 'completed' ||
      Boolean(job.result);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: isCompleted ? 'completed' : job.status,
      progress: isCompleted ? 100 : Math.min(98, job.progress),
      stage: isCompleted ? 'Enhancement complete! Video ready for export.' : job.stage,
      estimatedSecondsRemaining: isCompleted ? 0 : job.estimatedSecondsRemaining,
      creditCost: job.creditCost,
      creditsReserved: job.creditsReserved,
      creditsDeducted: job.creditsDeducted,
      result: job.result || null,
      error: job.error || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt || null,
    });
  } catch (err: any) {
    console.error('[Status API Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to retrieve job status',
        status: 'server_error',
      },
      { status: 500 }
    );
  }
}
