<script lang="ts">
    export let users: User[];
    export let hide;
    export let receiveChats;
    export let myId;
    export let chats;
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
            fetch("./addChat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    usersToAdd: usersToAdd,
                    chatName: chatName
                }),
            }).then((response) => {
                if (response.ok) {
                    receiveChats();
                    hide();
                } else {
                    message = "failed to add chat";
                }
            });
        }
    }
</script>

<style>
    .window {
        background-color: white;
        position: fixed;
        left: 50%;
        top: 30%;
    }

    p {
        margin: 0px;
        padding: 0px;
    }

    p input[type="checkbox"] {
        margin-right: 5px;
    }

    input[type="text"] {
        width: 120px;
    }
</style>

<div class="window">
    <form on:submit|preventDefault={createChat}>
        <p>
            <input type="submit" value="Create chat"/>
            <button
                    on:click={hide}>X
            </button>
        </p>
        <input type="text" name="chat_name" placeholder="Chat name" required/>
        <p style="color:red">{message}</p>
        {#each users as user}
            {#if user.id !== myId }
                <p><input type="checkbox" name={user.id} value={true}/>{user.name}</p>
            {/if}
        {/each}
    </form>
</div>
