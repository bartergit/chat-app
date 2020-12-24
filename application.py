import os
import time
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_login import LoginManager, login_user, current_user, logout_user
from flask_socketio import SocketIO, join_room, leave_room, send

from wtform_fields import *
from models import *

# Configure app
app = Flask(__name__)
app.secret_key=os.environ.get('SECRET')
app.config['WTF_CSRF_SECRET_KEY'] = "b'f\xfa\x8b{X\x8b\x9eM\x83l\x19\xad\x84\x08\xaa"
db = SQLAlchemy(app)

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
    # app.run(debug=True)
