import Image from "next/image";
import Header from "@/components/Header";
import TaskList from "@/components/TaskList";
import SupportPanel from "@/components/SupportPanel";
import ChatPanel from "@/components/ChatPanel";

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header />
      <main className="flex flex-1 p-6 space-x-6 overflow-y-auto">
        <div className="flex-1 flex flex-col space-y-6">
          <TaskList />
          <SupportPanel />
        </div>
        <div className="w-1/3">
          <ChatPanel />
        </div>
      </main>
    </div>
  );
}
