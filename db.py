import psycopg2
import time
import hashlib


def hash(key):
    return hashlib.pbkdf2_hmac('sha256', key.encode('utf-8'), DB_connection.SALT, DB_connection.ITERATION_NUMBER)


class User:
    def __init__(self, login, name, password=None):
        self.login = login
        self.name = name
        if password:
            self.hashed_pass = hash(password)

    @staticmethod
    def create_user_dict(args):
        user = {"login": args[1], "name": args[3], "id": args[0]}
        return user

    def __eq__(self, other):
        return self.login == other.login

    def __repr__(self):
        return f"({self.login}, {self.name})"


class MessageData:
    def __init__(self, content, from_user_id, time, chat_id):
        self.content = content
        self.from_user_id = from_user_id
        self.time = time
        self.chat_id = chat_id


class Chat:
    def __init__(self, chat_name, id):
        self.chat_name = chat_name
        self.id = id


class DB_connection:
    SALT = "barterSalt".encode('utf-8')
    ITERATION_NUMBER = 100000

    def __init__(self, db_name, db_user, db_password, db_host, db_port):
        self.connection = psycopg2.connect(
            database=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port,
        )
        self.connection.autocommit = True
        self.cursor = self.connection.cursor()

    def execute_query(self, query):
        self.cursor.execute(query)

    def get_data(self, query):
        self.cursor.execute(query)
        result = self.cursor.fetchall()
        return result

    def add_chat_user_by_id(self, chat_id, id):
        self.execute_query(
            f"insert into chat_users(chat_id_member, user_id_member) values({chat_id}, {id})")

    def insert_user(self, user):
        self.execute_query(
            f"insert into users(login, name, password) values('{user.login}', '{user.name}', {psycopg2.Binary(user.hashed_pass)})")
        user_id = self.get_data("SELECT currval('users_id_seq')")[0][0]
        self.add_chat_user_by_id(1, user_id)
        return user_id

    def insert_message(self, content, from_user_id, chat_id):
        self.execute_query(
            f"insert into messages(content, from_user_id, time, chat_id) values ('{content}', {from_user_id}, {int(round(time.time() * 1000))}, {chat_id})")

    def get_user_by_password(self, login, password):
        users = self.get_data(
            f"select * from users where login = '{login}' and password = {psycopg2.Binary(hash(password))}")
        if len(users) > 1:
            raise Exception("not valid db")
        return User.create_user_dict(users[0]) if users else None

    def get_user_by_id(self, id):
        return User.create_user_dict(self.get_data(f"select * from users where id = {id}")[0])

    def is_user_exist(self, login):
        return len(self.get_data(f"select * from users where login = '{login}'")) > 0

    def get_all_users_as_dict(self):
        users = self.get_data("select * from users")
        return [User.create_user_dict(x) for x in users]

    def get_messages_by_chat_id_as_dict(self, id):
        messages = self.get_data(
            f"select content, from_user_id, time, chat_id from messages inner join chats c on c.id = messages.chat_id where chat_id = {id}")
        return [MessageData(*message).__dict__ for message in messages]

    def get_chats_by_user_id_as_dict(self, id):
        chats = self.get_data(
            f"select chat_name, id from chats inner join chat_users cu on chats.id = cu.chat_id_member where cu.user_id_member = {id}")
        return [Chat(*chat).__dict__ for chat in chats]

    def get_users_id_by_chat_id_as_dict(self, id):
        users = self.get_data(
            f"select * from users inner join chat_users cu on users.id = cu.user_id_member where cu.chat_id_member = {id}")
        return [x[0] for x in users]

    def add_chat(self, chat_name, ids_members):
        self.execute_query(f"insert into chats(chat_name) values ('{chat_name}')")
        chat_id = self.get_data("SELECT currval('chat_id_seq')")[0][0]
        for user_id in ids_members:
            self.execute_query(f"insert into chat_users(chat_id_member, user_id_member) values ({chat_id}, {user_id})")


if __name__ == '__main__':
    db = DB_connection(
        "postgres", "postgres", "admin", "127.0.0.1", "5432"
    )
    print(db.get_chats_by_user_id_as_dict(1))
    print()
    print(db.get_chats_by_user_id_as_dict(1))
    db.cursor.close()
