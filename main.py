from flask import Flask, jsonify, send_from_directory, request, redirect, render_template, session
import json
from flask_socketio import SocketIO
from db import User, DB_connection
# --> starting app

app = Flask(__name__, static_url_path='',
            static_folder='client/public',
            template_folder='client/templates')
app.secret_key = "something_very_secret"
db = DB_connection("postgres", "postgres", "admin", "127.0.0.1", "5432")


# -->
@app.route('/addChat', methods=['POST'])
def addChat():
    data = json.loads(request.data)
    db.add_chat(data["chatName"], data["usersToAdd"])
    return "ok"
    # return str(session["current_user_id"])


@app.route('/me')
def me():
    return str(session["current_user_id"])


@app.route('/logout', methods=['GET'])
def logout():
    session["current_user_id"] = None
    return redirect("/")


@app.route('/login', methods=['GET'])
def login():
    login = request.args.get('login')
    password = request.args.get('password')
    if login is not None and password is not None:
        user = db.get_user_by_password(login, password)
        if user is not None:
            session["current_user_id"] = user["id"]
            return redirect("/")
        else:
            return render_template("login.html", error="no user found or password is wrong")
    else:
        return render_template("login.html")


@app.route("/register", methods=['GET'])
def register():
    login = request.args.get('login')
    name = request.args.get('name')
    password = request.args.get('password')
    user = User(login, name, password)
    if (not db.is_user_exist(login)) and name and password:
        user_id = db.insert_user(user)
        session["current_user_id"] = user_id
        return redirect("/")
    else:
        return render_template("register.html", error="wrong login")


@app.route("/")
def base():
    if session.get("current_user_id", None) is not None:
        return send_from_directory('client/public', 'index.html')
    else:
        return redirect("/login")


@app.route("/receiveMessages", methods=['GET'])
def receiveMessages():
    current_user_id = session.get("current_user_id", None)
    if current_user_id is not None:
        out_messages = {}
        chats = db.get_chats_by_user_id_as_dict(current_user_id)
        for chat in chats:
            out_messages[chat["id"]] = db.get_messages_by_chat_id_as_dict(chat["id"])
        return json.dumps(out_messages)
    else:
        return "Bad", 404


@app.route("/receiveChats", methods=['GET'])
def receiveChats():
    current_user_id = session.get("current_user_id", None)
    if current_user_id is not None:
        chats = db.get_chats_by_user_id_as_dict(current_user_id)
        for ind, chat in enumerate(chats):
            members_id = db.get_users_id_by_chat_id_as_dict(chat["id"])
            chats[ind]["members"] = members_id
        return jsonify(chats)
    else:
        return "Bad", 404


@app.route("/receiveUsers", methods=['GET'])
def receiveUsers():
    if session.get("current_user_id", None) is not None:
        return jsonify(db.get_all_users_as_dict())
    else:
        return "Bad", 404


@app.route("/sendMessage", methods=['POST'])
def sendMessage():
    if session["current_user_id"] is not None:
        data = json.loads(request.data)
        assert session["current_user_id"] == data["from_user_id"]
        db.insert_message(data["content"], session["current_user_id"], data["chat_id"])
        return "Ok", 200
    else:
        return "Bad", 404


if __name__ == '__main__':
    app.run(debug=True, host="localhost", port=8000)
    # app.run(host="localhost", port=8000, debug=True)
