# Portal Redirect Rules (V1)

## Landing Page Redirect

User visits `/`:

```
If authenticated:
  If role = chef → redirect /chef/dashboard
  If role = client → redirect /client
  If role unknown → redirect /error
If not authenticated:
  Show landing page (public)
```

## Login Redirect

After successful login:

```typescript
const roleData = await getUserRole(user.id);

if (roleData.role === 'chef' || roleData.role === 'chef_subaccount') {
  redirect('/chef/dashboard');
} else if (roleData.role === 'client') {
  redirect('/client');
} else {
  redirect('/error?code=no_role');
}
```

## Wrong Portal Redirect

Chef tries to access `/client`:

```
Middleware detects role mismatch
   ↓
Redirect to /chef/dashboard
```

Client tries to access `/chef/events`:

```
Middleware detects role mismatch
   ↓
Redirect to /client
```

## Logout Redirect

```typescript
await supabase.auth.signOut();
redirect('/');  // Landing page
```

## Error Redirect

Any auth/role error:

```typescript
redirect('/error?code=unauthorized');
redirect('/error?code=no_role');
redirect('/error?code=wrong_portal');
```
