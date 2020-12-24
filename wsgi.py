from app.main import app, socket_io

if __name__ == "__main__":
    socket_io.run(app)
