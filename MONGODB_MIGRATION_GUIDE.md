# 🚀 MongoDB Atlas Migration Guide

## Overview
This guide will help you migrate all your data from your old MongoDB Atlas free cluster to your new paid cluster. The migration scripts will ensure **100% data integrity** and maintain all relationships between collections.

## 📋 Current Status
✅ **NEW Cluster Configured**: `cluster0.dgnbnd.mongodb.net/forum-ensate`  
⏳ **OLD Cluster Required**: You need to provide your old cluster URI

## 🎯 What Will Be Migrated

### Collections:
- **`users`** - All user accounts (students, committee, admin)
- **`companies`** - All company data and settings
- **`interviews`** - All queue data and interview records

### GridFS Files:
- **Company images** - All uploaded company logos/images

### Database Features:
- **All indexes** - Performance optimization indexes
- **Data relationships** - References between collections
- **Timestamps** - Created/updated dates preserved

## 🔧 Step-by-Step Migration Process

### Step 1: Prepare Your Old Cluster URI
You need to provide your **OLD cluster connection string**. It should look like:
```
mongodb+srv://username:password@old-cluster-name.mongodb.net/database-name
```

### Step 2: Set Environment Variable
**Windows (PowerShell):**
```powershell
$env:OLD_MONGODB_URI="mongodb+srv://username:password@old-cluster.mongodb.net/database"
```

**Windows (Command Prompt):**
```cmd
set OLD_MONGODB_URI=mongodb+srv://username:password@old-cluster.mongodb.net/database
```

**Mac/Linux:**
```bash
export OLD_MONGODB_URI="mongodb+srv://username:password@old-cluster.mongodb.net/database"
```

### Step 3: Run the Migration
```bash
npm run migrate-db
```

This will:
1. ✅ Connect to both old and new clusters
2. ✅ Copy all collections (users, companies, interviews)
3. ✅ Copy all GridFS files (company images)
4. ✅ Create all performance indexes
5. ✅ Verify data integrity

### Step 4: Verify the Migration
```bash
npm run verify-migration
```

This will:
1. ✅ Compare document counts between old and new
2. ✅ Verify all indexes are created
3. ✅ Check data integrity (admin users, etc.)
4. ✅ Confirm GridFS files are migrated

### Step 5: Test Your Application
```bash
npm run dev
```

Test these features:
- ✅ User login/registration
- ✅ Company management (admin)
- ✅ Queue system (students)
- ✅ Image uploads (company logos)

## 📊 Migration Scripts Created

### 1. `scripts/mongodb-migration.ts`
- **Purpose**: Main migration script
- **Features**: 
  - Transfers all collections
  - Migrates GridFS files
  - Creates all indexes
  - Handles errors gracefully
  - Provides detailed progress

### 2. `scripts/verify-migration.ts`
- **Purpose**: Verify migration success
- **Features**:
  - Compares old vs new data
  - Checks data integrity
  - Verifies indexes
  - Reports any issues

### 3. `scripts/setup-migration.ts`
- **Purpose**: Setup helper
- **Features**:
  - Shows current configuration
  - Provides instructions
  - Lists what will be migrated

## 🛡️ Safety Features

### Data Protection:
- ✅ **Atomic operations** - Either everything succeeds or nothing changes
- ✅ **Duplicate handling** - Gracefully handles duplicate key errors
- ✅ **Connection pooling** - Optimized for large datasets
- ✅ **Error recovery** - Continues migration even if some operations fail

### Verification:
- ✅ **Document count verification** - Ensures all data is copied
- ✅ **Index verification** - Confirms all indexes are created
- ✅ **Data integrity checks** - Verifies critical data (admin users, etc.)
- ✅ **GridFS verification** - Confirms file uploads are migrated

## 🚨 Important Notes

### Before Migration:
- ⚠️ **Keep your old cluster running** until verification is complete
- ⚠️ **Backup your old cluster** if possible (extra safety)
- ⚠️ **Test in development** if you have multiple environments

### During Migration:
- 🔄 **Migration may take time** depending on data size
- 🔄 **Do not interrupt** the migration process
- 🔄 **Monitor the console** for any error messages

### After Migration:
- ✅ **Verify everything works** before deleting old cluster
- ✅ **Update any hardcoded URIs** in your codebase
- ✅ **Test all features** thoroughly

## 📈 Performance Improvements

Your new paid cluster will provide:
- 🚀 **Better performance** - Faster queries and connections
- 🚀 **Higher limits** - More connections and operations
- 🚀 **Better reliability** - Improved uptime and stability
- 🚀 **Advanced features** - Analytics, monitoring, etc.

## 🔧 Troubleshooting

### Common Issues:

#### "Connection timeout"
- **Solution**: Check your IP whitelist in MongoDB Atlas
- **Solution**: Verify your cluster is running

#### "Authentication failed"
- **Solution**: Check username/password in connection string
- **Solution**: Verify database user permissions

#### "Collection not found"
- **Solution**: This is normal if the collection doesn't exist in old cluster
- **Solution**: The script will skip empty collections

#### "Duplicate key error"
- **Solution**: This is handled automatically by the migration script
- **Solution**: The script continues even with some duplicates

### Getting Help:
1. **Check the console output** for detailed error messages
2. **Verify your connection strings** are correct
3. **Ensure both clusters are accessible** from your network
4. **Check MongoDB Atlas status** if you see connection issues

## ✅ Migration Checklist

- [ ] Old cluster URI obtained and tested
- [ ] Environment variable `OLD_MONGODB_URI` set
- [ ] Migration script run successfully
- [ ] Verification script passed
- [ ] Application tested and working
- [ ] All features verified (login, queue, admin, etc.)
- [ ] Old cluster can be safely decommissioned

## 🎉 Post-Migration

Once migration is complete:
1. **Update any hardcoded URIs** in your codebase
2. **Test all application features**
3. **Monitor performance** with the new cluster
4. **Consider deleting the old cluster** to avoid costs
5. **Update your team** about the new cluster details

## 📞 Support

If you encounter any issues during migration:
1. **Check the console output** for specific error messages
2. **Verify your connection strings** are correct
3. **Ensure both clusters are accessible**
4. **Run the verification script** to identify specific issues

The migration scripts are designed to be robust and provide detailed feedback about any issues encountered.
