export type ContactLink = {
  href: string;
  id: "email";
  label: string;
  value: string;
};

export type AppClientConfig = {
  contactLinks: ContactLink[];
  googleAuthEnabled: boolean;
};
