const linking = {
  prefixes: ["medanya://", "https://medanya.app"],
  config: {
    screens: {
      Auth: {
        screens: {
          Landing: "",
          Phone: "phone",
          Otp: "otp",
          ProfileCreation: "profile",
        },
      },
      Main: {
        screens: {
          Feed: "feed",
          Chat: {
            screens: {
              Chats: "chat",
              ChatRoom: "chat/:chatId",
            },
          },
          Jobs: {
            screens: {
              JobsList: "jobs",
              JobDetail: "jobs/:jobId",
            },
          },
          Videos: "videos",
          Live: "live",
          Profile: "profile",
        },
      },
    },
  },
};

export default linking;
