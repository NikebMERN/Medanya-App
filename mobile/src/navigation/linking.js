const linking = {
  prefixes: ["medanya://", "https://medanya.app"],
  config: {
    screens: {
      Auth: {
        screens: {
          Landing: "",
          Phone: "phone",
          Otp: "otp",
          ProfileCreation: "setup-profile",
        },
      },
      Main: {
        screens: {
          Home: "feed",
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
          Marketplace: {
            screens: {
              MarketplaceList: "marketplace",
              MarketplaceDetail: "marketplace/:itemId",
              CreateItem: "marketplace/sell",
            },
          },
          Safety: {
            screens: {
              SafetyHub: "safety",
              BlacklistSearch: "safety/blacklist",
              MissingList: "safety/missing",
              MissingDetail: "safety/missing/:id",
            },
          },
          Profile: "profile",
        },
      },
    },
  },
};

export default linking;
