import admin from 'firebase-admin'

// Lazy initialization - only initialize when first accessed
let adminDbInstance: admin.firestore.Firestore | null = null
let adminTimestampInstance: typeof admin.firestore.Timestamp | null = null

const initializeFirebaseAdmin = () => {
  if (!admin.apps.length) {
    const hasADC = !!process.env.GOOGLE_APPLICATION_CREDENTIALS
    const hasInlineCreds = !!(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    )

    if (hasADC) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      })
    } else if (hasInlineCreds) {
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY as string).replace(/\\n/g, '\n')
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID as string,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
          privateKey,
        }),
      })
    } else {
      // Fail fast with a clear error to avoid silent permission issues
      throw new Error(
        'Firebase Admin credentials missing. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local.'
      )
    }
  }

  if (!adminDbInstance) {
    adminDbInstance = admin.firestore()
    adminTimestampInstance = admin.firestore.Timestamp
  }

  return {
    db: adminDbInstance,
    timestamp: adminTimestampInstance,
  }
}

// Export lazy-loaded instances
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    return initializeFirebaseAdmin().db[prop as keyof admin.firestore.Firestore]
  }
})

export const AdminTimestamp = new Proxy({} as typeof admin.firestore.Timestamp, {
  get(_target, prop) {
    return (initializeFirebaseAdmin().timestamp as any)[prop]
  }
}) as typeof admin.firestore.Timestamp


