import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function createAdmin() {
  console.log("👑 Creating admin account...");

  const email = "admin@annaverse.org";
  const password = "Admin2024!";
  const firstName = "Admin";
  const lastName = "User";

  try {
    // Check if user already exists
    const existingUser = await db
      .select({ email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, email));

    if (existingUser.length > 0) {
      console.log("⚠️  User with this email already exists:");
      console.log(`   Email: ${existingUser[0].email}`);
      console.log(`   Role: ${existingUser[0].role}`);
      
      if (existingUser[0].role === 'admin') {
        console.log("✅ User is already an admin. Use reset-admin-password.ts if needed.");
        return;
      } else {
        console.log("🔄 Updating existing user to admin role...");
        
        // Hash the new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Update existing user to admin
        const result = await db
          .update(users)
          .set({
            role: 'admin',
            status: 'approved',
            passwordHash: hashedPassword,
            firstName,
            lastName,
            isActive: true,
            updatedAt: new Date()
          })
          .where(eq(users.email, email))
          .returning({ email: users.email, role: users.role, status: users.status });

        console.log("✅ User updated to admin successfully!");
        console.log(`   Email: ${result[0].email}`);
        console.log(`   Role: ${result[0].role}`);
        console.log(`   Status: ${result[0].status}`);
      }
    } else {
      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new admin user
      const result = await db
        .insert(users)
        .values({
          email,
          firstName,
          lastName,
          passwordHash: hashedPassword,
          role: 'admin',
          status: 'approved',
          isActive: true,
        })
        .returning({ 
          id: users.id, 
          email: users.email, 
          role: users.role, 
          status: users.status 
        });

      console.log("✅ Admin account created successfully!");
      console.log(`   ID: ${result[0].id}`);
      console.log(`   Email: ${result[0].email}`);
      console.log(`   Role: ${result[0].role}`);
      console.log(`   Status: ${result[0].status}`);
    }

    console.log("\n🚀 Admin login credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log("\n⚠️  Please change the password after first login!");

  } catch (error) {
    console.error("❌ Error creating admin account:", error);
  }

  process.exit(0);
}

createAdmin();