import os
import time
from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_socketio import SocketIO, join_room, leave_room, send
from db import User, DB_connection #


# Configure app
app = Flask(__name__, static_url_path='',
            static_folder='static',
            template_folder='templates')
app.secret_key=os.environ.get('SECRET')
DATABASE_URL = os.environ['DATABASE_URL']
db = DB_connection(DATABASE_URL)
socketio = SocketIO(app, manage_session=False)


@app.route("/click", methods=['GET', 'POST'])
def index():
    socketio.emit('message', 35)
    return render_template("click.html")


@socketio.on('addChat')
def addChat(data):
    db.add_chat(data["chatName"], data["usersToAdd"])
    socketio.emit("get chats", receiveChats()[0])
    return "ok", 200
    # return str(session["current_user_id"])


@socketio.on('me')
def me():
    return session["current_user_id"]


@app.route('/logout', methods=['GET'])
def logout():
    session["current_user_id"] = None
    return redirect("/")


@app.route('/login', methods=['GET'])
def login():
    login = request.args.get('login')
    password = request.args.get('password')
    if login is not None and password is not None:
        if not db.is_user_exist(login):
            return render_template("login.html", error="no user found")
        user = db.get_user_by_password(login, password)
        if user is not None:
            session["current_user_id"] = user["id"]
            return redirect("/")
        else:
            return render_template("login.html", error="password is wrong")
    else:
        return render_template("login.html")


@app.route("/register", methods=['GET'])
def register():
    login = request.args.get('login')
    name = request.args.get('name')
    password = request.args.get('password')
    user = User(login, name, password)
    if db.is_user_exist(login):
        return render_template("register.html", error="user with the same login already exists")
    if name and password:
        user_id = db.insert_user(user)
        session["current_user_id"] = user_id
        return redirect("/")
    return render_template("register.html")


@app.route("/")
def base():
    if session.get("current_user_id", None) is not None:
        return render_template('index.html')
    else:
        return redirect("/login")

@socketio.on("receiveMessages")
def receiveMessages():
    current_user_id = session.get("current_user_id", None)
    if current_user_id is not None:
        out_messages = {}
        chats = db.get_chats_by_user_id_as_dict(current_user_id)
        for chat in chats:
            out_messages[chat["id"]] = db.get_messages_by_chat_id_as_dict(chat["id"])
        socketio.emit("get messages", out_messages)
        return out_messages, 200
    else:
        return "Bad", 404


@socketio.on("receiveChats")
def receiveChats():
    current_user_id = session.get("current_user_id", None)
    if current_user_id is not None:
        chats = db.get_chats_by_user_id_as_dict(current_user_id)
        for ind, chat in enumerate(chats):
            members_id = db.get_users_id_by_chat_id_as_dict(chat["id"])
            chats[ind]["members"] = members_id
        socketio.emit("get chats", chats)
        return chats, 200
    else:
        return "Bad", 404


@socketio.on("receiveUsers")
def receiveUsers():
    if session.get("current_user_id", None) is not None:
        socketio.emit("get users", db.get_all_users_as_dict())
        return "Ok", 200
    else:
        return "Bad", 404


@socketio.on("sendMessage")
def sendMessage(data):
    if session["current_user_id"] is not None:
        # assert session["current_user_id"] == data["from_user_id"]
        db.insert_message(data["content"][:670], session["current_user_id"], data["chat_id"])
        socketio.emit("get messages", receiveMessages()[0])
        return "Ok", 200
    else:
        return "Bad", 404


if __name__ == "__main__":
    socketio.run(app)
