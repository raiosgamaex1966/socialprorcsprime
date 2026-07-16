
-- Allow admins/moderators to view all promotion_credits
CREATE POLICY "Admins can view all promotion credits"
ON public.promotion_credits FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Allow admins/moderators to update any user's credits
CREATE POLICY "Admins can update any promotion credits"
ON public.promotion_credits FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Allow admins/moderators to insert promotion credits for any user
CREATE POLICY "Admins can insert promotion credits"
ON public.promotion_credits FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Allow admins/moderators to insert credit transactions for any user
CREATE POLICY "Admins can insert any credit transaction"
ON public.credit_transactions FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Allow admins to view all credit transactions
CREATE POLICY "Admins can view all credit transactions"
ON public.credit_transactions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
