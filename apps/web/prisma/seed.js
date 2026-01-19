const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const hostname = process.env.DEFAULT_DOMAIN_HOSTNAME || "localhost";

  await prisma.domain.upsert({
    where: { hostname },
    update: {},
    create: { hostname },
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
