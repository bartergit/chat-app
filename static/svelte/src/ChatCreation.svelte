<script lang="ts">
    export let users: User[];
    export let myId;
    export let changeVisibility;
    export let socket;
    let message = "";

    function createChat(e) {
        message = "";
        const formData = new FormData(e.target);
        const chatName = formData.get('chat_name');
        let usersToAdd = []
        for (let i in users) {
            if (formData.get(users[i].id) == "true") {
                usersToAdd.push(users[i].id);
            }
        }
        if (usersToAdd.length == 0) {
            message = "select at least 1 user";
        } else {
            usersToAdd.push(myId);
            socket.emit("addChat", {usersToAdd: usersToAdd, chatName: chatName}, (res) => {
                if (res == "ok") {
                    socket.emit("receiveMessages");
                    changeVisibility();
                } else {
                    message = "chat name is not valid";
                }
            })
        }
        document.addEventListener("keydown", (event) => {
            let button = document.getElementById("createChatButton");
            if (event.code == "Enter" && button) {
                button.click();
            }
        });
    }
</script>

<style>
    .window {
        background-color: white;
        position: fixed;
        left: 50%;
        top: 30%;
        width: 140px;
    }

    form {
        display: flex;
        flex-direction: column;
    }

    form div {
        width: auto;
    }

    div {
        margin: 0;
        padding: 0;
    }

    p input[type="checkbox"] {
        margin-right: 5px;
    }

    #buttons-panel {
        display: flex;
    }
</style>

<div class="window">
    <form on:submit|preventDefault={createChat}>
        <div id="buttons-panel">
            <input id="createChatButton" type="submit" value="Create chat"/>
            <button
                    on:click={(e)=>{e.preventDefault(); changeVisibility()}}>X
            </button>
        </div>
        <input spellcheck="false" type="text" name="chat_name" placeholder="Chat name" required/>
        <p style="color:red">{message}</p>
        {#each users as user}
            {#if user.id !== myId }
                <p title={user.name} style="overflow: hidden; word-break: break-all; height: 20px">
                    <input type="checkbox" name={user.id} value={true}/>{user.name}</p>
            {/if}
        {/each}
    </form>
</div>