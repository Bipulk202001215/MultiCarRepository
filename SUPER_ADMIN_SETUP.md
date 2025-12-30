# Super Admin Setup Guide

This guide explains how to create and login as a super admin user who can perform all administrative operations.

## Quick Start: Creating Your First Super Admin

### Option 1: Sign Up as First User (Recommended for Initial Setup)

1. **Navigate to Login Page**
   - Go to `/login` in your browser
   - Click "Don't have an account? Sign up"

2. **Create Account**
   - Enter your email and password
   - Enter a display name (optional)
   - Click "Sign Up"

3. **Initial Setup Required**
   - The first user created via signup will have ADMIN role but **no company assigned**
   - You need to complete the setup manually:
     - Create a company
     - Create roles
     - Create permissions
     - Map permissions to roles
     - Assign roles to your user

### Option 2: Manual Setup via Firebase Console (For Production)

If you need to create a super admin manually:

1. **Create User in Firebase Authentication**
   - Go to Firebase Console → Authentication
   - Click "Add user"
   - Enter email and password
   - Note the User UID

2. **Create User Document in Firestore**
   - Go to Firestore Database
   - Navigate to `users` collection
   - Create a document with the User UID as document ID
   - Add fields:
     ```json
     {
       "email": "admin@example.com",
       "displayName": "Super Admin",
       "companyId": "",  // Will be set after creating company
       "roleIds": [],    // Will be set after creating roles
       "createdAt": [timestamp],
       "updatedAt": [timestamp]
     }
     ```

3. **Complete Setup via Admin Dashboard** (see below)

## Complete Setup Flow

After logging in, follow these steps to become a full super admin:

### Step 1: Access Admin Dashboard

1. **Login** with your account
2. **Navigate to Admin Dashboard**
   - Click "Admin Dashboard" or "User Management" in the sidebar
   - Or go directly to `/admin/users`
   - **Note**: You need `USER_MANAGEMENT` permission to access this page

### Step 2: Create Company

1. In Admin Dashboard, go to **"Companies"** tab
2. Click **"Create Company"**
3. Fill in company details:
   - Company Name
   - GSTIN (15 characters)
   - Address
   - Phone
   - Email
   - State Code (2 digits)
4. Click **"Create Company"**
5. **Note the Company ID** (you'll need it later)

### Step 3: Create Roles

1. Go to **"Roles"** tab
2. Click **"Create Role"**
3. Create all necessary roles:
   - ADMIN
   - ACCOUNTANT
   - MECHANIC
   - SERVICE_ADVISOR
   - INVENTORY_MANAGER
4. **Note the Role IDs** for ADMIN role (you'll need it)

### Step 4: Create Permissions

1. Go to **"Permissions"** tab
2. Click **"Create Permission"**
3. Create all necessary permissions:
   - USER_MANAGEMENT
   - ROLE_MANAGEMENT
   - PERMISSION_MANAGEMENT
   - COMPANY_MANAGEMENT
   - INVENTORY_MANAGEMENT
   - JOB_CARD_MANAGEMENT
   - INVOICE_MANAGEMENT
   - SUPPLIER_MANAGEMENT
   - PURCHASE_ORDER_MANAGEMENT
   - VIEW_DASHBOARD
4. **Note the Permission IDs** (you'll need them)

### Step 5: Map Permissions to Roles

1. Go to **"Role-Permissions"** tab
2. Click **"Create Role-Permission Mapping"**
3. For **ADMIN role**, attach **ALL permissions**:
   - ADMIN → USER_MANAGEMENT
   - ADMIN → ROLE_MANAGEMENT
   - ADMIN → PERMISSION_MANAGEMENT
   - ADMIN → COMPANY_MANAGEMENT
   - ADMIN → INVENTORY_MANAGEMENT
   - ADMIN → JOB_CARD_MANAGEMENT
   - ADMIN → INVOICE_MANAGEMENT
   - ADMIN → SUPPLIER_MANAGEMENT
   - ADMIN → PURCHASE_ORDER_MANAGEMENT
   - ADMIN → VIEW_DASHBOARD

4. For other roles, attach appropriate permissions:
   - ACCOUNTANT → INVOICE_MANAGEMENT
   - SERVICE_ADVISOR → JOB_CARD_MANAGEMENT
   - INVENTORY_MANAGER → INVENTORY_MANAGEMENT, SUPPLIER_MANAGEMENT, PURCHASE_ORDER_MANAGEMENT

### Step 6: Assign Company and Roles to Your User

1. Go to **"Users"** tab
2. Find your user in the list
3. Click **"Edit"**
4. **Update your user**:
   - Select the company you created
   - Select the ADMIN role (and any other roles you need)
5. Click **"Update User"**

**Congratulations!** You are now a super admin with full access.

## What Super Admin Can Do

Once you have the ADMIN role with all permissions, you can:

### ✅ User Management
- Create, edit, and delete users
- Assign users to companies
- Assign multiple roles to users
- View all users and their permissions

### ✅ Role Management
- Create new roles
- View all existing roles

### ✅ Permission Management
- Create new permissions
- View all existing permissions

### ✅ Role-Permission Mapping
- Attach permissions to roles
- Remove permissions from roles
- View all role-permission mappings

### ✅ Company Management
- Create companies
- View all companies

## Troubleshooting

### Can't Access Admin Dashboard?

**Problem**: You don't see "Admin Dashboard" in the sidebar or get redirected.

**Solutions**:
1. **Check if you have USER_MANAGEMENT permission**:
   - Your user must have a role that has USER_MANAGEMENT permission
   - ADMIN role should have all permissions including USER_MANAGEMENT

2. **Verify your role assignments**:
   - Go to Users tab (if accessible)
   - Check your user's assigned roles
   - Ensure ADMIN role is assigned

3. **Check role-permission mappings**:
   - Go to Role-Permissions tab
   - Verify ADMIN role has USER_MANAGEMENT permission attached

### First User Has No Company?

**Problem**: First user created via signup has no company assigned.

**Solution**:
1. Create a company (Companies tab)
2. Edit your user (Users tab)
3. Select the company
4. Assign ADMIN role
5. Save

### Need to Grant Admin Access to Existing User?

1. Go to Admin Dashboard → Users tab
2. Find the user
3. Click "Edit"
4. Assign ADMIN role
5. Ensure ADMIN role has all permissions (check Role-Permissions tab)
6. Save

## Security Notes

⚠️ **Important**:
- Only users with `USER_MANAGEMENT` permission can access the admin dashboard
- Super admin should have ADMIN role with ALL permissions
- Keep your admin credentials secure
- Don't share admin access unnecessarily

## Quick Reference

**Admin Dashboard URL**: `/admin/users`

**Required Permission**: `USER_MANAGEMENT`

**Super Admin Setup Checklist**:
- [ ] User account created
- [ ] Company created
- [ ] ADMIN role created
- [ ] All permissions created
- [ ] All permissions mapped to ADMIN role
- [ ] User assigned to company
- [ ] ADMIN role assigned to user
- [ ] Can access `/admin/users` page

---

**Need Help?** Check the main dashboard for setup flow instructions or review the codebase documentation.




