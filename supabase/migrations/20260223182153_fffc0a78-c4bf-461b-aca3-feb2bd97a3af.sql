
-- Allow management to delete workers (GDPR)
CREATE POLICY "Management can delete workers"
ON public.workers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'management'::app_role));

-- Allow management to delete worker documents (GDPR cascade)
CREATE POLICY "Management can delete worker documents"
ON public.worker_documents
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'management'::app_role));

-- Allow management to delete internal notes (GDPR cascade)
CREATE POLICY "Management can delete internal notes"
ON public.internal_notes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'management'::app_role));

-- Allow management to delete pipeline history (GDPR cascade)
CREATE POLICY "Management can delete pipeline history"
ON public.pipeline_stage_history
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'management'::app_role));

-- Allow clients to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (recipient_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid());
