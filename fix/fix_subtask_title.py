from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["task_assistant"]
tasks = db.tasks

for task in tasks.find():
    updated = False
    subtasks = task.get("subtasks", [])
    for subtask in subtasks:
        if "title" not in subtask or not subtask["title"]:
            subtask["title"] = subtask.get("description", "")
            updated = True
    if updated:
        tasks.update_one({"_id": task["_id"]}, {"$set": {"subtasks": subtasks}})