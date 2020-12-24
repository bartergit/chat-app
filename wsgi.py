from app.main import app, socket_io
import os

if __name__ == "__main__":
    socket_io.run(app, port=os.environ["PORT"] or 3000)
