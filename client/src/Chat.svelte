<svelte:head>
    <link rel="stylesheet" type="text/css" href="chat.css"/>
</svelte:head>
<script lang="ts">
    import ChatCreation from "./ChatCreation.svelte";
    import Message from "./Message.svelte";

    interface User {
        readonly id: number;
        name: string;
        login: string;
    }

    interface MessageData {
        content: string;
        time: number;
        from_user_id: number;
    }

    interface Chat {
        id: number;
        chat_name: string;
        members: number[];
    }

    function changeCurrentChat(chat) {
        currentChat = chat;
    }

    async function sendMessage() {
        if (currentMessage.trim() != "") {
            fetch("./sendMessage", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: currentMessage,
                    from_user_id: myId,
                    chat_id: currentChat.id,
                }),
            }).then((response) => {
                if (response.ok) {
                    receiveMessages();
                    currentMessage = "";
                } else {
                    console.error("error", response);
                }
            });
        }
    }

    function receiveUsers() {
        fetch("./receiveUsers").then((response) => {
            if (response.ok) {
                response.json().then((data) => {
                    users = data;
                    receiveChats();
                });
            } else {
                console.error("error", response);
            }
        });
    }

    function receiveChats() {
        fetch("./receiveChats").then((response) => {
            if (response.ok) {
                response.json().then((data) => {
                    chats = data;
                    currentChat = data[0];
                    receiveMessages();
                });
            } else {
                console.error("error", response);
            }
        });
    }

    function receiveMessages() {
        fetch("./receiveMessages").then((response) => {
            if (response.ok) {
                response.json().then((data) => {
                    messages = data;
                    // console.log("ALl launched successfully");
                    ready = true;
                });
            } else {
                console.error("error", response);
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.code == "Enter") {
            sendMessage();
        }
    });

    function findUserById(id: number): User {
        for (let index = 0; index < users.length; index++) {
            if (users[index].id == id) return users[index];
        }
    }

    $: getLastChatMessage = (chatId: number): string => {
        if (messages != undefined && chatId != undefined && messages[chatId] != undefined && messages[chatId].length > 0) {
            let lastMessage = messages[chatId][messages[chatId].length - 1];
            return `<b>${findUserById(lastMessage.from_user_id).name}:
		</b>${lastMessage.content.slice(0, 20)}${
                lastMessage.content.length < 20 ? "" : "..."
            }`;
        } else {
            return "<b>Noone:</b>Nothing";
        }
    };
    //------>
    let users: User[];
    let chats: Chat[];
    let messages: MessageData[][];
    let myId: number;
    let currentChat: Chat;
    let currentMessage = "";
    let isChatCreationMenuVisible = false;
    let ready = false;
    let viewMembers = false;
    fetch("./me").then((response) => {
        if (response.ok) {
            response.json().then((data) => {
                myId = parseInt(data);
                receiveUsers();
            });
        } else {
            console.error("error", response);
        }
    });
    setInterval(receiveMessages, 1000);
</script>
{#if isChatCreationMenuVisible && ready}
    <ChatCreation {users} {receiveChats} {chats} {myId} hide={() => (isChatCreationMenuVisible = false)}/>
{/if}
{#if ready}
    <div class="container">
        {#if viewMembers}
            <div class="view">
                <ul>
                    {#each currentChat.members as memberId}
                        <li>{findUserById(memberId).name}</li>
                    {/each}
                </ul>
            </div>
        {/if}
        <div class="leftSide">
            <div class="vertical">
                <h2>Chats:</h2>
                <button
                        on:click={() => (isChatCreationMenuVisible = true)}>+
                </button>
            </div>
            {#each chats as chat}
                <div>
                    <div
                            class="chat"
                            class:activeChat={chat.id === currentChat.id}
                            on:click={() => {
							changeCurrentChat(chat);
						}}>
                        <b>{chat.chat_name}</b>
                        <p>
                            {@html getLastChatMessage(chat.id)}
                        </p>
                    </div>
                </div>
            {/each}
        </div>
        <div class="rightSide">
            <div class="messages">
                <div class="upperPanel">
                    <b>{currentChat.chat_name}</b>
                    <button style="width: auto" on:click={()=>viewMembers=!viewMembers}>View members</button>
                    <form action="./logout"><span
                            style="margin-right: 20px">@{findUserById(myId).login} {findUserById(myId).name}</span><input
                            type="submit" value="Log out"/></form>
                </div>
                {#each messages[currentChat.id] as message}
                    <Message
                            {message}
                            name={findUserById(message.from_user_id).name}
                            self={message.from_user_id === myId}/>
                {/each}
            </div>
            <div class="inputBox">
                <p>
                    <input bind:value={currentMessage} type="text"/>
                    <button on:click={sendMessage}>Send</button>
                </p>
            </div>
        </div>
    </div>
{/if}
