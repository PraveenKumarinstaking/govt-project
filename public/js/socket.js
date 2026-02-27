/**
 * HAERMS — Socket.IO client init
 */
let socket;

function initSocket(role) {
    socket = io();

    socket.on('connect', () => {
        console.log('🔌 Socket connected:', socket.id);
        if (role) socket.emit('join:role', role);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
    });

    return socket;
}
