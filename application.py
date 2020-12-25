import os
from flask import Flask, render_template, request, redirect, session
from flask_socketio import SocketIO, join_room, leave_room
from db import User, DB_connection  #

# Configure app
app = Flask(__name__, static_url_path='',
            static_folder='static',
            template_folder='templates')
app.secret_key = os.environ.get('SECRET', "SECRET")
if os.environ.get("prod"):
    DATABASE_URL = os.environ.get('DATABASE_URL')
    db = DB_connection(DATABASE_URL)
else:
    db = DB_connection(
        "127.0.0.1", "postgres", "postgres", "admin", "5432"
    )
socketio = SocketIO(app, manage_session=False)

#???
@socketio.on('addChat')
def addChat(data):
    db.add_chat(data["chatName"], data["usersToAdd"])
    socketio.emit("refresh chats")
    return "ok", 200


@socketio.on('me')
def me():
    join_room(request.sid)
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
        socketio.emit("refresh users")
        return redirect("/")
    return render_template("register.html")


@app.route("/")
def base():
    current_user_id = session.get("current_user_id", None)
    if current_user_id is not None:
        return render_template('index.html')
    else:
        return redirect("/login")


@socketio.on("receiveMessages")
def receiveMessages():
    current_user_id = session.get("current_user_id", None)
    if current_user_id is not None:
        try:
            out_messages = {}
            chats = db.get_chats_by_user_id_as_dict(current_user_id)
            for chat in chats:
                out_messages[chat["id"]] = db.get_messages_by_chat_id_as_dict(chat["id"])
            socketio.emit("get messages", out_messages, room=request.sid)
            return "ok"
        except:
            return "bad"
    else:
        return "bad"


@socketio.on("receiveChats")
def receiveChats():
    current_user_id = session.get("current_user_id", None)
    if current_user_id is not None:
        try:
            chats = db.get_chats_by_user_id_as_dict(current_user_id)
            for ind, chat in enumerate(chats):
                members_id = db.get_users_id_by_chat_id_as_dict(chat["id"])
                join_room(chat["id"])
                chats[ind]["members"] = members_id
            socketio.emit("get chats", chats, room=request.sid)
            return "ok"
        except:
            return "bad"
    else:
        return "Bad", 404


@socketio.on("receiveUsers")
def receiveUsers():
    current_user_id = session.get("current_user_id", None)
    if current_user_id is not None:
        try:
            socketio.emit("get users", db.get_all_users_as_dict())
            return "ok"
        except:
            return "bad"
    else:
        return "Bad", 404


@socketio.on("sendMessage")
def sendMessage(data):
    if session["current_user_id"] is not None:
        db.insert_message(data["content"][:670], session["current_user_id"], data["chat_id"])
        socketio.emit("refresh messages", room=data["chat_id"])
        return "Ok", 200
    else:
        return "Bad", 404


if __name__ == "__main__":
    socketio.run(app)
