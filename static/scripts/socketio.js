document.addEventListener('DOMContentLoaded', () => {
    // Connect to websocket
    var socket = io()//.connect(location.protocol + '//' + document.domain + ':' + location.port, (s) => {console.log(s);});
    socket.on('connect', () => {socket.emit('try', "somethign to path"); console.log("connected")});
    socket.on('message', data => {
        console.log(data);
    });
    document.getElementById('button').onclick = () =>{
        socket.emit('try', "somethign to path");
    }
});
