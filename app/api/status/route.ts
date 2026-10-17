import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob, createJob } from '@/lib/jobs';
import { clerkClient } from '@clerk/nextjs/server';

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

    let job = getJob(jobId);

    // If job is not in local memory (different Vercel Lambda instance) OR is still in processing,
    // query Modal's durable store for the authoritative status.
    if (!job || job.status === 'processing' || job.status === 'queued') {
      const modalStatusUrl =
        process.env.MODAL_STATUS_URL ||
        'https://abdulrafayhamid99--kosmos-ai-pipeline-get-status-endpoint.us-east.modal.run';

      try {
        const modalRes = await fetch(`${modalStatusUrl}?job_id=${encodeURIComponent(jobId)}`, {
          signal: AbortSignal.timeout(6000),
          cache: 'no-store',
        });

        if (modalRes.ok) {
          const modalData = await modalRes.json();

          if (modalData && modalData.status) {
            const isCompleted =
              modalData.status === 'completed' ||
              modalData.status === 'succeeded';

            if (isCompleted) {
              if (!job) {
                job = createJob({
                  id: jobId,
                  userId: modalData.userId || null,
                  creditCost: modalData.creditCost || 10,
                  params: {
                    videoUrl: '',
                    resolution: modalData.outputResolution || '4K',
                    fps: modalData.fps || 60,
                    cameraPresetId: modalData.cameraPreset || 'neutral',
                    grainLevel: 0,
                    fieldMode: 'progressive',
                    shutterFix: false,
                    targetGamma: 'rec709',
                    isPreview: false,
                  },
                });
              }

              // Commit atomic Clerk credit deduction if not already deducted
              if (!job.creditsDeducted && job.userId) {
                try {
                  const user = await clerkClient.users.getUser(job.userId);
                  const currentCredits = typeof user.unsafeMetadata?.credits === 'number'
                    ? (user.unsafeMetadata.credits as number)
                    : 100;
                  const currentReserved = typeof user.unsafeMetadata?.reservedCredits === 'number'
                    ? (user.unsafeMetadata.reservedCredits as number)
                    : 0;
                  const updatedCredits = Math.max(0, currentCredits - job.creditCost);
                  const updatedReserved = Math.max(0, currentReserved - job.creditCost);
                  const activeHolds = { ...((user.unsafeMetadata?.activeHolds as Record<string, any>) || {}) };
                  delete activeHolds[jobId];

                  await clerkClient.users.updateUser(job.userId, {
                    unsafeMetadata: {
                      ...(user.unsafeMetadata || {}),
                      credits: updatedCredits,
                      reservedCredits: updatedReserved,
                      activeHolds,
                    },
                  });
                  console.log(`[Status API] Atomic billing committed ${job.creditCost} credits for User ${job.userId}.`);
                } catch (clerkErr) {
                  console.warn(`[Status API] Clerk credit deduction note for ${job.userId}:`, clerkErr);
                }
              }

              updateJob(jobId, {
                status: 'succeeded',
                creditsDeducted: true,
                progress: 100,
                stage: 'Enhancement complete! Video ready for export.',
                result: modalData,
              });
            }

            return NextResponse.json({
              success: true,
              jobId,
              status: isCompleted ? 'completed' : modalData.status,
              progress: isCompleted ? 100 : (modalData.progress ?? (job ? job.progress : 25)),
              stage: modalData.stage || (isCompleted ? 'Enhancement complete! Video ready for export.' : 'Processing on Modal GPU...'),
              estimatedSecondsRemaining: isCompleted ? 0 : (modalData.estimatedSecondsRemaining ?? (job ? job.estimatedSecondsRemaining : 30)),
              creditCost: job?.creditCost || modalData.creditCost || 10,
              creditsReserved: job?.creditsReserved ?? true,
              creditsDeducted: job?.creditsDeducted ?? isCompleted,
              result: isCompleted ? modalData : (job?.result || null),
              error: modalData.error || null,
              createdAt: modalData.createdAt || job?.createdAt || Date.now(),
              updatedAt: modalData.updatedAt || Date.now(),
              completedAt: modalData.completedAt || (isCompleted ? Date.now() : null),
            });
          }
        }
      } catch (modalErr: any) {
        console.warn(`[Status API] Modal status fetch note for ${jobId}:`, modalErr?.message || modalErr);
      }
    }

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
