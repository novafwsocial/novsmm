import { db } from "../src/lib/db";

async function main() {
  console.log("🎭 Seeding roles and permissions...");

  const roles = [
    {
      name: "admin",
      description: "Full platform access — all resources, all actions",
      color: "#0052ff",
      isSystem: true,
      permissions: { "*": "read,create,update,delete,approve" },
    },
    {
      name: "supervisor",
      description: "Manage users, orders, tickets — no settings or billing",
      color: "#10b981",
      isSystem: true,
      permissions: {
        user: "read,update",
        order: "read,create,update",
        service: "read,update",
        ticket: "read,create,update",
        wallet: "read",
        provider: "read",
        notification: "read,create",
      },
    },
    {
      name: "support",
      description: "Handle tickets and view user info",
      color: "#f59e0b",
      isSystem: true,
      permissions: {
        user: "read",
        ticket: "read,create,update",
        order: "read",
      },
    },
    {
      name: "moderator",
      description: "Content moderation — review and moderate marketplace",
      color: "#8b5cf6",
      isSystem: true,
      permissions: {
        service: "read,update,delete",
        order: "read,update",
        user: "read,update",
      },
    },
    {
      name: "reseller",
      description: "Marketplace, own orders, wallet, API keys",
      color: "#64748b",
      isSystem: true,
      permissions: {
        order: "read,create",
        wallet: "read,create",
        service: "read",
        ticket: "read,create",
        notification: "read",
      },
    },
    {
      name: "agency",
      description: "Manage multiple creators, bulk orders, analytics",
      color: "#ec4899",
      isSystem: true,
      permissions: {
        order: "read,create",
        wallet: "read,create",
        service: "read",
        ticket: "read,create",
        notification: "read",
      },
    },
    {
      name: "user",
      description: "Basic access — buy services, view own data",
      color: "#94a3b8",
      isSystem: true,
      permissions: {
        order: "read,create",
        wallet: "read",
        service: "read",
        ticket: "read,create",
        notification: "read",
      },
    },
  ];

  for (const role of roles) {
    const { permissions, ...roleData } = role;
    const created = await db.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description, color: roleData.color },
      create: roleData,
    });

    // Create permissions
    for (const [resource, actions] of Object.entries(permissions)) {
      await db.permission.upsert({
        where: {
          roleId_resource: { roleId: created.id, resource },
        },
        update: { actions },
        create: { roleId: created.id, resource, actions },
      });
    }
    console.log(`  ✓ Role: ${roleData.name} (${Object.keys(permissions).length} permissions)`);
  }

  console.log(`\n✅ ${roles.length} roles seeded!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
