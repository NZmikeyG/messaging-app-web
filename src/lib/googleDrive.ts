import { google } from 'googleapis'
import { Readable } from 'stream'

// Scope for Google Drive Access
const SCOPES = ['https://www.googleapis.com/auth/drive.file']

// Initialize Auth
const getauth = () => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') // Handle newline characters in env var

    // If no service account, we can't do default drive
    if (!email || !key) {
        return null
    }

    return new google.auth.JWT({
        email,
        key,
        scopes: SCOPES,
    })
}

// Default drive (Service Account) - might be null
const auth = getauth();
const defaultDrive = auth ? google.drive({ version: 'v3', auth }) : null
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID

export interface DriveFile {
    id: string
    name: string
    mimeType: string
    webViewLink?: string
    iconLink?: string
    thumbnailLink?: string
    modifiedTime?: string
    size?: string
}

export async function listFiles(query?: string, pageToken?: string, authClient?: any) {
    try {
        const drive = authClient ? google.drive({ version: 'v3', auth: authClient }) : defaultDrive

        if (!drive) {
            throw new Error("No Drive Client available (No Integration selected and No Service Account configured)")
        }

        // Default query: Not trashed
        let q = "trashed = false"

        // Only use ROOT_FOLDER_ID if we are using the default (Service Account) drive
        if (!authClient && ROOT_FOLDER_ID) {
            q += ` and '${ROOT_FOLDER_ID}' in parents`
        }

        if (query) {
            q += ` and name contains '${query}'`
        }

        // If using user auth, we might want to filter sensitive folders or just show root.
        // For now, let's keep it open.

        const res = await drive.files.list({
            pageSize: 20,
            pageToken,
            q,
            fields: 'nextPageToken, files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, modifiedTime, size)',
            orderBy: 'folder,modifiedTime desc', // Folders first, then recent
        })

        return res.data
    } catch (error) {
        console.error('Google Drive List Error:', error)
        throw error
    }
}

export async function uploadFile(
    fileStream: Readable,
    fileName: string,
    mimeType: string,
    folderId: string = (!process.env.GOOGLE_CLIENT_ID && ROOT_FOLDER_ID) ? ROOT_FOLDER_ID : '',
    authClient?: any
) {
    try {
        const drive = authClient ? google.drive({ version: 'v3', auth: authClient }) : defaultDrive

        if (!drive) {
            throw new Error("No Drive Client available")
        }

        const fileMetadata: any = {
            name: fileName,
        }

        if (folderId) {
            fileMetadata.parents = [folderId]
        }

        const media = {
            mimeType,
            body: fileStream,
        }

        const res = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink',
        })

        return res.data
    } catch (error) {
        console.error('Google Drive Upload Error:', error)
        throw error
    }
}

export async function deleteFile(fileId: string, authClient?: any) {
    try {
        const drive = authClient ? google.drive({ version: 'v3', auth: authClient }) : defaultDrive
        if (!drive) throw new Error("No drive client")

        await drive.files.delete({
            fileId
        })
        return true
    } catch (error) {
        console.error("Google Drive Delete Error:", error)
        throw error
    }
}
