const express = require("express");
const app = express();
const Discord = require("discord.js");
const client = new Discord.Client({
  intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS"],
  allowedMentions: { parse: ["users"] },
});
const Database = require("@replit/database");
const db = new Database();

client.on("ready", () => {
  console.log("Bot-Tracker is running");
});


client.on("guildMemberAdd", async (member) => {
  const creationDate = member.user.createdAt;
  const currentDate = new Date();
  const differenceInMonths =
    (currentDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

  const guildId = member.guild.id;
  const possibleBotsKey = `${guildId}:Possible_Bots`;
  const suspiciousPeopleKey = `${guildId}:Suspicious_People`;

  //change the amount of months
  if (differenceInMonths < 3) {
    const data = await db.get(possibleBotsKey);
    if (!data) {
      await db.set(possibleBotsKey, [{ id: member.user.id, name: member.user.username }]);
    } else {
      await db.set(possibleBotsKey, [
        ...data,
        { id: member.user.id, name: member.user.username },
      ]);
    }
  } else {
    const isPossibleBot = (await db.get(possibleBotsKey))?.some((user) => user.id === member.user.id);
    if (isPossibleBot) {
      const messages = await member.guild.members.cache.get(member.id).messages.fetch();
      const latestMessage = messages.last();
      //change the ammount of weeks here (currently 3)
      if (latestMessage && (currentDate.getTime() - latestMessage.createdTimestamp) / (1000 * 60 * 60 * 24 * 7) >= 3) {
        const data = await db.get(suspiciousPeopleKey);
        if (!data) {
          await db.set(suspiciousPeopleKey, [{ id: member.user.id, name: member.user.username }]);
        } else {
          await db.set(suspiciousPeopleKey, [
            ...data,
            { id: member.user.id, name: member.user.username },
          ]);
        }
      }
    }
  }
});

client.on("guildMemberRemove", async (member) => {
  const guildId = member.guild.id;
  const possibleBotsKey = `${guildId}:Possible_Bots`;
  const suspiciousPeopleKey = `${guildId}:Suspicious_People`;

  const possibleBotsData = await db.get(possibleBotsKey);
  const suspiciousPeopleData = await db.get(suspiciousPeopleKey);

  const updatedPossibleBotsData = possibleBotsData && possibleBotsData.filter(user => user.id !== member.user.id);
  const updatedSuspiciousPeopleData = suspiciousPeopleData && suspiciousPeopleData.filter(user => user.id !== member.user.id);

  if (updatedPossibleBotsData && updatedPossibleBotsData.length !== possibleBotsData.length) {
    await db.set(possibleBotsKey, updatedPossibleBotsData);
  }

  if (updatedSuspiciousPeopleData && updatedSuspiciousPeopleData.length !== suspiciousPeopleData.length) {
    await db.set(suspiciousPeopleKey, updatedSuspiciousPeopleData);
  }
});



const sendUserList = async (message) => {
  const guildId = message.guild.id;
  const possibleBotsKey = `${guildId}:Possible_Bots`;

  const data = await db.get(possibleBotsKey);
  if (data && data.length > 0) {
    const userEmbed = new Discord.MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Possible_Bots")
      .setDescription("The following users have accounts less than 3 months old:")
      .addFields(
        ...data.map((user) => {
          return { name: user.name, value: user.id };
        })
      );
    message.channel.send({ embeds: [userEmbed] });
  } else {
    message.channel.send("No new users found.");
  }
};

client.on("messageCreate", (message) => {
  if (
    message.content === "!p_bots" &&
    message.member.permissions.has("KICK_MEMBERS")
  ) {
    sendUserList(message);
  }
});

const sendInactiveUserList = async (message) => {
  if (!message.member.permissions.has("KICK_MEMBERS")) {
    message.channel.send("You do not have permission to use this command.");
    return;
  }
  const guildId = message.guild.id;
  const suspiciousPeopleKey = `${guildId}:Suspicious_People`;

  const data = await db.get(suspiciousPeopleKey);
  if (data && data.length > 0) {
    const userEmbed = new Discord.MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Suspicious_People")
      .setDescription("The following users have been identified as suspicious:")
      .addFields(
        ...data.map((user) => {
          return { name: user.name, value: user.id };
        })
      );
    message.channel.send({ embeds: [userEmbed] });
  } else {
    message.channel.send("No suspicious users found.");
  }
};


client.on("messageCreate", (message) => {
  if (message.content === "!s_people" && message.member.permissions.has("KICK_MEMBERS")) {
    sendInactiveUserList(message);
  }
});

client.login(process.env.token);

app.get("/", (req, res) => {
  res.send("Bot-Tracker is running");
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

module.exports = { client };
