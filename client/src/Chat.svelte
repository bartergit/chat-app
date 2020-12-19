<svelte:head>
    <link rel="stylesheet" type="text/css" href="chat.css"/>
    <link rel="stylesheet" type="text/css" href="message.css"/>
</svelte:head>
<script lang="ts">
    import {onMount} from 'svelte';
    import ChatCreation from "./ChatCreation.svelte";
    import Message from "./Message.svelte";
    import {io} from "socket.io-client";

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
                    if (!ready) {
                        currentChat = data[0];
                        receiveMessages();
                    }
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
                    ready = true;
                });
            } else {
                console.error("error", response);
            }
        });
    }

    function scrollToBottom(dontCheckCondition = false) {
        let messageContent = document.getElementById("messages-content");
        if (dontCheckCondition || messageContent.scrollHeight - messageContent.scrollTop - messageContent.getBoundingClientRect().height < 200) {
            messageContent.scrollTo({top: messageContent.scrollHeight, behavior: 'smooth'});
        }
    }

    document.addEventListener("keydown", (event) => {
        if (event.code == "Enter" && !isChatCreationMenuVisible) {
            sendMessage();
            scrollToBottom(true);
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
    let ready = false;
    let viewMembers = false;
    // fetch("./me").then((response) => {
    //     if (response.ok) {
    //         response.json().then((data) => {
    //             myId = parseInt(data);
    //             receiveUsers();
    //         });
    //     } else {
    //         console.error("error", response);
    //     }
    // });
    const socket = io("ws://localhost:8000");
    socket.on('connect', ()=>{
        console.log("connected");
        socket.emit("me", (myId)=>{
            console.log(myId)
        })
    });
    socket.on('hello', (data)=>{
        console.log(data);
    })
    // io.on('connection', (socket) => {
    //     socket.emit('connection');
    //     console.log('a user connected');
    //     socket.on('disconnect', () => {
    //         console.log('user disconnected');
    //     });
    // });
    // setInterval(receiveMessages, 1000);
    // function load() {
    //     onMount(async () => {

    // const res = await fetch(`https://jsonplaceholder.typicode.com/photos?_limit=20`);
    // photos = await res.json();
    // });
    // }
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
        <ChatCreation {isChatCreationMenuVisible} {changeVisibility} {users} {receiveChats} {chats} {myId}/>
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
                    <button on:click={sendMessage}>Send</button>
                </div>
            </div>
        </div>
    </div>
{/if}
