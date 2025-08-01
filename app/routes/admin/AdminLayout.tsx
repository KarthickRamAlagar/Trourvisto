//@ts-nocheck
import { Outlet, redirect } from "react-router";
import { SidebarComponent } from "@syncfusion/ej2-react-navigations";
import { MobileSideBar, NavItems } from "../../../components";
import { account } from "~/appwrite/client";
import { getExistingUser, storeUserData } from "~/appwrite/auth";
export async function clientLoader() {
  try {
    const user = await account.get();
    if (!user?.$id) return redirect("/sign-in");

    let existingUser = await getExistingUser(user.$id);

    // If user not stored yet, create and return
    if (!existingUser) {
      existingUser = await storeUserData();
    }

    return existingUser;
  } catch (e) {
    console.error("Error in AdminLayout clientLoader", e);
    return redirect("/sign-in");
  }
}

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <MobileSideBar />
      <aside className="w-full max-w-[270px] hidden lg:block">
        <SidebarComponent width={270} enableGestures={false}>
          <NavItems />
        </SidebarComponent>
      </aside>
      <aside className="children">
        <Outlet />
      </aside>
    </div>
  );
};

export default AdminLayout;
