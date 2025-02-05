-- Update camps policy
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "camps_select_policy" ON camps;
CREATE POLICY "camps_select_policy" ON camps
    FOR SELECT
    USING (
        team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "camps_insert_policy" ON camps;
CREATE POLICY "camps_insert_policy" ON camps
    FOR INSERT
    WITH CHECK (
        team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "camps_update_policy" ON camps;
CREATE POLICY "camps_update_policy" ON camps
    FOR UPDATE
    USING (
        team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    )
    WITH CHECK (
        team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "camps_delete_policy" ON camps;
CREATE POLICY "camps_delete_policy" ON camps
    FOR DELETE
    USING (
        team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    );

-- Update registrations policy
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registrations_select_policy" ON registrations;
CREATE POLICY "registrations_select_policy" ON registrations
    FOR SELECT
    USING (
        camp_id IN (
            SELECT id 
            FROM camps 
            WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "registrations_insert_policy" ON registrations;
CREATE POLICY "registrations_insert_policy" ON registrations
    FOR INSERT
    WITH CHECK (
        camp_id IN (
            SELECT id 
            FROM camps 
            WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "registrations_update_policy" ON registrations;
CREATE POLICY "registrations_update_policy" ON registrations
    FOR UPDATE
    USING (
        camp_id IN (
            SELECT id 
            FROM camps 
            WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        camp_id IN (
            SELECT id 
            FROM camps 
            WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "registrations_delete_policy" ON registrations;
CREATE POLICY "registrations_delete_policy" ON registrations
    FOR DELETE
    USING (
        camp_id IN (
            SELECT id 
            FROM camps 
            WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
        )
    );

-- Update campers policy
ALTER TABLE campers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campers_select_policy" ON campers;
CREATE POLICY "campers_select_policy" ON campers
    FOR SELECT
    USING (
        registration_id IN (
            SELECT id 
            FROM registrations 
            WHERE camp_id IN (
                SELECT id 
                FROM camps 
                WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "campers_insert_policy" ON campers;
CREATE POLICY "campers_insert_policy" ON campers
    FOR INSERT
    WITH CHECK (
        registration_id IN (
            SELECT id 
            FROM registrations 
            WHERE camp_id IN (
                SELECT id 
                FROM camps 
                WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "campers_update_policy" ON campers;
CREATE POLICY "campers_update_policy" ON campers
    FOR UPDATE
    USING (
        registration_id IN (
            SELECT id 
            FROM registrations 
            WHERE camp_id IN (
                SELECT id 
                FROM camps 
                WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
            )
        )
    )
    WITH CHECK (
        registration_id IN (
            SELECT id 
            FROM registrations 
            WHERE camp_id IN (
                SELECT id 
                FROM camps 
                WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "campers_delete_policy" ON campers;
CREATE POLICY "campers_delete_policy" ON campers
    FOR DELETE
    USING (
        registration_id IN (
            SELECT id 
            FROM registrations 
            WHERE camp_id IN (
                SELECT id 
                FROM camps 
                WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
            )
        )
    );

-- Update payments policy
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_policy" ON payments;
CREATE POLICY "payments_select_policy" ON payments
    FOR SELECT
    USING (
        registration_id IN (
            SELECT id 
            FROM registrations 
            WHERE camp_id IN (
                SELECT id 
                FROM camps 
                WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
CREATE POLICY "payments_insert_policy" ON payments
    FOR INSERT
    WITH CHECK (
        registration_id IN (
            SELECT id 
            FROM registrations 
            WHERE camp_id IN (
                SELECT id 
                FROM camps 
                WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "payments_update_policy" ON payments;
CREATE POLICY "payments_update_policy" ON payments
    FOR UPDATE
    USING (
        registration_id IN (
            SELECT id 
            FROM registrations 
            WHERE camp_id IN (
                SELECT id 
                FROM camps 
                WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
            )
        )
    )
    WITH CHECK (
        registration_id IN (
            SELECT id 
            FROM registrations 
            WHERE camp_id IN (
                SELECT id 
                FROM camps 
                WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "payments_delete_policy" ON payments;
CREATE POLICY "payments_delete_policy" ON payments
    FOR DELETE
    USING (
        registration_id IN (
            SELECT id 
            FROM registrations 
            WHERE camp_id IN (
                SELECT id 
                FROM camps 
                WHERE team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
            )
        )
    ); 