"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import {
  deciflujoAccessControl,
  deciflujoRoles,
} from "@/lib/access-control";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac: deciflujoAccessControl,
      roles: deciflujoRoles,
    }),
  ],
});
