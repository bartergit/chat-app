<svelte:head>
    <link rel="stylesheet" type="text/css" href="styles/chat.css"/>
    <link rel="stylesheet" type="text/css" href="styles/message.css"/>
    <script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/socket.io/1.3.6/socket.io.min.js"></script>
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

    function scrollToBottom(dontCheckCondition = false) {
        if (dontCheckCondition || ready) {
            let messageContent = document.getElementById("messages-content");
            if (dontCheckCondition || messageContent.scrollHeight - messageContent.scrollTop - messageContent.getBoundingClientRect().height < 500) {
                messageContent.scrollTo({top: messageContent.scrollHeight, behavior: 'smooth'});
            }
        }
    }

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
            return "<b>No one:</b>Nothing";
        }
    };

    function changeVisibility() {
        isChatCreationMenuVisible = !isChatCreationMenuVisible && !viewMembers;
    }

    //------>

    let users: User[];
    let chats: Chat[];
    let messages: MessageData[][];
    let myId: number;
    let currentChat: Chat;
    let currentMessage = "";
    let isChatCreationMenuVisible = false;
    $: ready = chats != undefined && currentChat != undefined && messages != undefined && users != undefined;
    let viewMembers = false;
    let socket;
    let sendMessage;
    const onSocketLoad = () => {
        socket = io();
        console.log(socket);
        console.log("hello");
        socket.emit("me", data => console.log(data));
        socket.on('connect', () => {
            console.log("connected");
            socket.emit("me", (data) => {
                myId = data;
                socket.emit("receiveUsers", () => {
                    socket.emit("receiveChats", () => {
                        socket.emit("receiveMessages", () => {
                            // ready = true;
                        })
                    })
                })
            })
        });
        socket.on("get users", (data) => {
            console.log("users", data);
            users = data;
        });
        socket.on("get messages", (data) => {
            console.log("messages", data);
            messages = data;
            setTimeout(scrollToBottom, 100);
        })
        socket.on("get chats", (data) => {
            chats = data;
            console.log("chats", data);
            currentChat = chats[0];
        })

        sendMessage = ()=>{
            socket.emit("sendMessage", {
                content: currentMessage,
                from_user_id: myId,
                chat_id: currentChat.id,
            });
            setTimeout(() => scrollToBottom(true), 100);
            currentMessage = "";
        }

        document.addEventListener("keydown", (event) => {
            if (event.code == "Enter" && !isChatCreationMenuVisible && currentMessage.trim() != "") {
                sendMessage();
            }
        });
    }
    document.onreadystatechange = onSocketLoad;
</script>
{#if viewMembers}
    <div class="view">
        <ul>
            <h2>Members</h2>
            {#each currentChat.members as memberId}
                <li>{findUserById(memberId).name}</li>
            {/each}
        </ul>
    </div>
{/if}
{#if ready}
    {#if isChatCreationMenuVisible}
        <ChatCreation {isChatCreationMenuVisible} {changeVisibility} {users} {socket} {myId}/>
    {/if}
    <div class="container">
        <div class="leftSide">
            <div class="vertical">
                <h2>Chats:</h2>
                <button
                        on:click={changeVisibility}>+
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
                    <div>
                        <b title={currentChat.chat_name}>{currentChat.chat_name.length < 16 ? currentChat.chat_name : currentChat.chat_name.slice(0, 16) + "..."}</b>
                    </div>
                    <div>
                        <button style="width: auto"
                                on:click={()=>{viewMembers=!viewMembers && !isChatCreationMenuVisible}}>View members
                        </button>
                    </div>
                    <div class="withForm">
                        <form action="./logout"><span>@{findUserById(myId).login} {findUserById(myId).name}</span><input
                                type="submit" value="Log out"/></form>
                    </div>
                </div>
                <div id="messages-content">
                    {#each messages[currentChat.id] as message}
                        <Message
                                {message}
                                name={findUserById(message.from_user_id).name}
                                self={message.from_user_id === myId}/>
                    {/each}
                </div>
                <div class="inputBox">
                    <input bind:value={currentMessage} type="text"/>
                    <button on:click ={sendMessage}>Send</button>
                </div>
            </div>
        </div>
    </div>
{/if}
