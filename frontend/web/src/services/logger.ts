import { supabase } from './supabase';

export enum ActionFlag {
    ADDITION = 1,
    CHANGE = 2,
    DELETION = 3
}

export const logAdminAction = async (actionFlag: ActionFlag, objectRepr: string, changeMessage: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user email if not available in session (though it should be)
        const username = user.email || 'Admin';

        const { error } = await supabase.from('logs').insert([{
            username: username,
            action_flag: actionFlag,
            object_repr: objectRepr,
            change_message: changeMessage,
            action_time: new Date().toISOString()
        }]);

        if (error) {
            console.error('Database error while logging:', error.message);
        }
    } catch (error) {
        console.error('Failed to log admin action', error);
    }
};
