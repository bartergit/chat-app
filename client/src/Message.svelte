<script lang="ts">
  export let message;
  export let self: boolean;
  export let name: string;
</script>

<div class:right={self} class="incoming_msg">
  <div class="img_div"><img src="user-profile.png" alt="icon" /></div>
  <div class="content_div">
    <span> {name}</span>
    <div class="message_itself">
      <p>{message.content}</p>
      <span class="time">{new Date(message.time).toLocaleString()}</span>
    </div>
  </div>
</div>
