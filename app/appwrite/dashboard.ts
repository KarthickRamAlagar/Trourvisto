import { parseTripData } from "~/lib/utils";
import { database, appwriteConfig } from "./client";
import { cachedQuery } from "./cache";
import { Query } from "appwrite";
interface Document {
  [key: string]: any;
}

type FilterByDate = (
  items: Document[],
  key: string,
  start: string,
  end?: string
) => number;


export const getUsersAndTripsStats = async (): Promise<DashboardStats> => {
  return cachedQuery("dashboardStats", async () => {
    const d = new Date();
    const startCurrent = new Date(
      d.getFullYear(),
      d.getMonth(),
      1
    ).toISOString();
    const startPrev = new Date(
      d.getFullYear(),
      d.getMonth() - 1,
      1
    ).toISOString();
    const endPrev = new Date(d.getFullYear(), d.getMonth(), 0).toISOString();

    const [users, trips] = await Promise.all([
      database.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId
      ),
      database.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.tripCollectionId
      ),
    ]);

    const filterByDate: FilterByDate = (items, key, start, end) =>
      items.filter((item) => item[key] >= start && (!end || item[key] <= end))
        .length;

    const filterUsersByRole = (role: string) => {
      return users.documents.filter((u: Document) => u.status === role);
    };

    return {
      totalUsers: users.total,
      usersJoined: {
        currentMonth: filterByDate(
          users.documents,
          "joinedAt",
          startCurrent,
          undefined
        ),
        lastMonth: filterByDate(
          users.documents,
          "joinedAt",
          startPrev,
          endPrev
        ),
      },
      userRole: {
        total: filterUsersByRole("user").length,
        currentMonth: filterByDate(
          filterUsersByRole("user"),
          "joinedAt",
          startCurrent,
          undefined
        ),
        lastMonth: filterByDate(
          filterUsersByRole("user"),
          "joinedAt",
          startPrev,
          endPrev
        ),
      },
      totalTrips: trips.total,
      tripsCreated: {
        currentMonth: filterByDate(
          trips.documents,
          "createdAt",
          startCurrent,
          undefined
        ),
        lastMonth: filterByDate(
          // Fixed: This was incorrectly filtering users instead of trips
          trips.documents,
          "createdAt",
          startPrev,
          endPrev
        ),
      },
    };
  });
};
export const getUserGrowthPerDay = async () => {
  const users = await database.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId
  );

  const userGrowth = users.documents.reduce(
    (acc: { [key: string]: number }, user: Document) => {
      const date = new Date(user.joinedAt);
      const day = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    },
    {}
  );

  return Object.entries(userGrowth).map(([day, count]) => ({
    count: Number(count),
    day,
  }));
};

export const getTripsCreatedPerDay = async () => {
  const trips = await database.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.tripCollectionId
  );

  const tripsGrowth = trips.documents.reduce(
    (acc: { [key: string]: number }, trip: Document) => {
      const date = new Date(trip.createdAt);
      const day = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    },
    {}
  );

  return Object.entries(tripsGrowth).map(([day, count]) => ({
    count: Number(count),
    day,
  }));
};


export const getTripsByTravelStyle = async () => {
  const trips = await database.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.tripCollectionId
  );

  const travelStyleCounts: Record<string, number> = {};
  const fallbackCount = trips.documents.reduce((count, trip) => {
    const parsed = parseTripData(trip.tripDetails);
    if (parsed.travelStyle && typeof parsed.travelStyle === "string") {
      const normalized = parsed.travelStyle.trim().toLowerCase();
      travelStyleCounts[normalized] = (travelStyleCounts[normalized] || 0) + 1;
    } else {
      count++;
    }
    return count;
  }, 0);

  if (fallbackCount > 0) {
    travelStyleCounts["luxury"] =
      (travelStyleCounts["luxury"] || 0) + fallbackCount;
  }

  const chartData = Object.entries(travelStyleCounts).map(
    ([travelStyle, count]) => ({
      count,
      travelStyle,
    })
  );

  return chartData.length === 0
    ? [{ travelStyle: "luxury", count: 1 }]
    : chartData;
}



const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
