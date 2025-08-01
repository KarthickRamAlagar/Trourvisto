import { ID, OAuthProvider, Query } from "appwrite";
import { account, database, appwriteConfig } from "~/appwrite/client";
import { redirect } from "react-router";

export const getExistingUser = async (id: string) => {
  try {
    const { documents, total } = await database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", id)]
    );
    return total > 0 ? documents[0] : null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};



export const storeUserData = async () => {
  try {
    const user = await account.get();
    if (!user) throw new Error("User not found");

    // First check again if user exists (race condition protection)
    const existingUser = await getExistingUser(user.$id);
    if (existingUser) return existingUser;

    const { providerAccessToken } = (await account.getSession("current")) || {};
    const profilePicture = providerAccessToken
      ? await getGooglePicture(providerAccessToken)
      : null;

    const createdUser = await database.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountId: user.$id,
        email: user.email,
        name: user.name,
        imageUrl: profilePicture,
        joinedAt: new Date().toISOString(),
        status: "admin", // Default status
      }
    );

    if (!createdUser.$id) throw new Error("Failed to create user document");
    return createdUser;
  } catch (error) {
    console.error("Error storing user data:", error);
    throw error;
  }
};
const getGooglePicture = async (accessToken: string) => {
  try {
    const response = await fetch(
      "https://people.googleapis.com/v1/people/me?personFields=photos",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error("Failed to fetch Google profile picture");

    const { photos } = await response.json();
    return photos?.[0]?.url || null;
  } catch (error) {
    console.error("Error fetching Google picture:", error);
    return null;
  }
};

export const loginWithGoogle = async () => {
  try {
    const isProd = window.location.origin === "https://tourvisto-ai.vercel.app";

    const successUrl =
      import.meta.env.VITE_SUCCESS_URL ||
      (isProd
        ? "https://tourvisto-ai.vercel.app/"
        : `${window.location.origin}/`);

    const failureUrl =
      import.meta.env.VITE_FAILURE_URL ||
      (isProd
        ? "https://tourvisto-ai.vercel.app/"
        : `${window.location.origin}/404`);

    await account.createOAuth2Session(
      OAuthProvider.Google,
      successUrl,
      failureUrl
    );
  } catch (error) {
    console.error("Error during OAuth2 session creation:", error);
  }
};

export const logoutUser = async () => {
  try {
    await account.deleteSession("current");
  } catch (error) {
    console.error("Error during logout:", error);
  }
};



export const getUser = async () => {
  try {
    const user = await account.get();
    if (!user?.$id) throw new Error("No user session found");

    // Use a transaction-like pattern to prevent duplicates
    let existingUser = await getExistingUser(user.$id);
    if (!existingUser) {
      existingUser = await storeUserData();
    }

    return existingUser;
  } catch (error) {
    console.error("Error in getUser():", error);
    throw error;
  }
};
export const getAllUsers = async (limit: number, offset: number) => {
  try {
    const { documents: users, total } = await database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.limit(limit), Query.offset(offset)]
    );

    if (total === 0) return { users: [], total };

    return { users, total };
  } catch (e) {
    console.log("Error fetching users");
    return { users: [], total: 0 };
  }
};
