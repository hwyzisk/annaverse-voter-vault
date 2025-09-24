import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function resetAdminPassword() {
  console.log("🔐 Resetting admin password...");

  const email = "admin@test.com";
  const newPassword = "Password123";

  try {
    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password
    const result = await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.email, email))
      .returning({ email: users.email, role: users.role });

    if (result.length > 0) {
      console.log("✅ Password reset successful!");
      console.log(`   Email: ${result[0].email}`);
      console.log(`   Role: ${result[0].role}`);
      console.log(`   New Password: ${newPassword}`);
      console.log("\n🚀 You can now log in with:");
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${newPassword}`);
    } else {
      console.log("❌ No user found with that email address");
    }

  } catch (error) {
    console.error("❌ Error resetting password:", error);
  }

  process.exit(0);
}

resetAdminPassword();