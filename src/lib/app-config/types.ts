export type ContactLink = {
  href: string;
  id: "email" | "github" | "telegram";
  label: string;
  value: string;
};

export type AppClientConfig = {
  contactLinks: ContactLink[];
  googleAuthEnabled: boolean;
};
