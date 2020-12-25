import os
import time
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_socketio import SocketIO, join_room, leave_room, send

# Configure app
app = Flask(__name__, static_url_path='',
            static_folder='static',
            template_folder='templates')
app.secret_key=os.environ.get('SECRET')
socketio = SocketIO(app, manage_session=False)

@app.route("/", methods=['GET', 'POST'])
def index():
    socketio.emit('message', 35)
    return render_template("chat.html")




@socketio.on('try')
def on_message(data):
    socketio.emit('message', 35)
    print(data)
    return 12

if __name__ == "__main__":
    socketio.run(app)
