// src/test-invoke.js or add to an existing component
import { invoke } from '@tauri-apps/api/core';

window.testCreateEvent = async () => {
    try {
        const id = await invoke('create_planner_event', {
            repositoryId: null,
            title: 'Demo',
            description: 'test',
            startAt: new Date().toISOString(),
            endAt: new Date(Date.now() + 3600000).toISOString(),
            recurrence: null
        });
        console.log('Planner event created, id =', id);
        return id;
    } catch (err) {
        console.error('Error creating planner event:', err);
        throw err;
    }
};
// Test deleting an event
window.testDeleteEvent = async (eventId) => {
    try {
        await invoke('delete_planner_event', {
            id: eventId
        });
        console.log(`Planner event ${eventId} deleted successfully`);
        return true;
    } catch (err) {
        console.error('Error deleting planner event:', err);
        throw err;
    }
};
